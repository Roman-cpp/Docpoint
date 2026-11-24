use std::collections::{HashMap, VecDeque};
use std::io::Read;

use crate::domain::catalog::dto::{CreateNodeDTO, NewNode, NodePayload};
use crate::domain::catalog::entity::NodeKind;
use crate::domain::catalog::repository::CatalogRepository;
use crate::domain::doc_api::endpoint::dto::CreateEndpointDTO;
use crate::domain::doc_api::endpoint_request::dto::ImportEndpointRequestDTO;
use crate::domain::doc_api::group::dto::CreateGroupDTO;
use crate::domain::doc_api::group::repository::GroupRepository;
use crate::domain::doc_erd::entity::dto::{CreateEntityDTO, EntityPositionDTO};
use crate::domain::doc_erd::entity::repository::EntityRepository;
use crate::domain::doc_erd::entity_relation::dto::RelationEndpointsDTO;
use crate::domain::doc_erd::entity_relation::repository::RelationRepository;
use crate::domain::doc_erd::frame::dto::CreateFrameDTO;
use crate::domain::doc_erd::frame::repository::FrameRepository;
use crate::domain::environment::environment::dto::{CreateEnvironmentDTO, CreateVariableDTO};
use crate::domain::environment::environment::repository::EnvironmentRepository;
use crate::domain::environment::environment_auth::dto::UpdateEnvironmentAuthDTO;
use crate::domain::environment::environment_auth::repository as auth_repository;
use crate::domain::environment::environment_proxy::dto::UpdateEnvironmentProxyDTO;
use crate::domain::environment::environment_proxy::repository as proxy_repository;
use crate::domain::file::repository::DocFileRepository;
use crate::domain::platform::dto::CreatePlatformDTO;
use crate::domain::platform::entity::Platform;
use crate::domain::platform::repository::PlatformRepository;
use crate::domain::websocket::message::dto::CreateWebsocketMessageDTO;
use crate::domain::websocket::message::repository::WebsocketMessageRepository;
use crate::repository::filesystem::file::FileRepo;
use crate::repository::sqlite::catalog::CatalogRepo;
use crate::repository::sqlite::doc_file::DocFileRepo;
use crate::repository::sqlite::entity::EntityRepo;
use crate::repository::sqlite::entity_relation::RelationRepo;
use crate::repository::sqlite::environment::EnvironmentRepo;
use crate::repository::sqlite::erd_frame::FrameRepo;
use crate::repository::sqlite::group::GroupRepo;
use crate::repository::sqlite::platform::PlatformRepo;
use crate::repository::sqlite::websocket_message::WebsocketMessageRepo;
use crate::service::catalog::create_tree_node;
use crate::state::AppState;

use super::manifest::{Manifest, ManifestNode};

struct ImportedArchive {
    manifest: Manifest,
    /// Байты файловых вложений, по пути внутри архива (`files/<id>/<filename>`).
    files: HashMap<String, Vec<u8>>,
}

/// Импортирует zip-архив как новую платформу — всегда с нуля: все id внутри
/// заводятся заново, существующие платформы не трогаются и не перезаписываются.
/// Показывает системный диалог выбора файла; `Ok(None)` — пользователь отменил
/// выбор.
pub async fn import_platform(state: &AppState) -> Result<Option<Platform>, String> {
    let Some(archive) = read_archive().await? else {
        return Ok(None);
    };

    let created = PlatformRepo::new(&state.db)
        .create(&CreatePlatformDTO {
            name: archive.manifest.platform.name.clone(),
            desc: archive.manifest.platform.desc.clone(),
        })
        .await?;

    match do_import(state, &created.id, &archive).await {
        Ok(()) => Ok(Some(created)),
        Err(error) => {
            // Платформа синтетическая — целиком наша, откатываем её так же,
            // как обычное удаление, вместо переписывания сервисов на
            // транзакции.
            let _ = crate::service::delete_platform(state, created.id).await;
            Err(error)
        }
    }
}

/// Диалог выбора файла и разбор архива — целиком в одном блокирующем
/// замыкании, без обращения к `AppState`/БД.
async fn read_archive() -> Result<Option<ImportedArchive>, String> {
    tokio::task::spawn_blocking(move || -> Result<Option<ImportedArchive>, String> {
        let Some(path) = rfd::FileDialog::new()
            .add_filter("Docpoint платформа", &["zip"])
            .pick_file()
        else {
            return Ok(None);
        };

        let file = std::fs::File::open(&path).map_err(|e| e.to_string())?;
        let mut zip = zip::ZipArchive::new(file).map_err(|e| e.to_string())?;

        let manifest: Manifest = {
            let mut entry = zip.by_name("manifest.json").map_err(|e| e.to_string())?;
            let mut raw = String::new();
            entry.read_to_string(&mut raw).map_err(|e| e.to_string())?;
            serde_json::from_str(&raw).map_err(|e| e.to_string())?
        };

        let mut files = HashMap::new();
        for i in 0..zip.len() {
            let mut entry = zip.by_index(i).map_err(|e| e.to_string())?;
            if entry.is_dir() || entry.name() == "manifest.json" {
                continue;
            }
            let name = entry.name().to_string();
            let mut bytes = Vec::new();
            entry.read_to_end(&mut bytes).map_err(|e| e.to_string())?;
            files.insert(name, bytes);
        }

        Ok(Some(ImportedArchive { manifest, files }))
    })
    .await
    .map_err(|e| e.to_string())?
}

async fn do_import(
    state: &AppState,
    platform_id: &str,
    archive: &ImportedArchive,
) -> Result<(), String> {
    import_environments(state, platform_id, archive).await?;

    let ordered = order_for_import(&archive.manifest.nodes)?;
    let mut id_of: HashMap<&str, String> = HashMap::new();

    for node in ordered {
        let parent_id = match node.parent_id.as_deref() {
            Some(archive_parent) => Some(id_of.get(archive_parent).cloned().ok_or_else(|| {
                "импорт платформы: узел ссылается на неизвестного родителя".to_string()
            })?),
            None => None,
        };

        let created_id = import_node(state, platform_id, parent_id, node, archive).await?;
        id_of.insert(node.id.as_str(), created_id);
    }

    Ok(())
}

async fn import_environments(
    state: &AppState,
    platform_id: &str,
    archive: &ImportedArchive,
) -> Result<(), String> {
    let environments = EnvironmentRepo::new(&state.db);

    for env in &archive.manifest.environments {
        let created = environments
            .create(
                platform_id,
                &CreateEnvironmentDTO {
                    env: env.env.clone(),
                    label: env.label.clone(),
                    base_url: env.base_url.clone(),
                    prefix: env.prefix.clone(),
                },
            )
            .await?;

        for variable in &env.variables {
            environments
                .create_variable(
                    &created.id,
                    &CreateVariableDTO {
                        name: variable.name.clone(),
                        value: variable.value.clone(),
                        is_secret: variable.is_secret,
                    },
                )
                .await?;
        }

        if let Some(auth) = &env.auth {
            auth_repository::upsert(
                &state.db,
                &UpdateEnvironmentAuthDTO {
                    environment_id: created.id.clone(),
                    auth_type: auth.auth_type.clone(),
                    basic_username: auth.basic_username.clone(),
                    basic_password: auth.basic_password.clone(),
                    token_source: auth.token_source.clone(),
                    credential_name: auth.credential_name.clone(),
                    scheme: auth.scheme.clone(),
                    url: auth.url.clone(),
                    method: auth.method.clone(),
                    body: auth.body.clone(),
                    body_content_type: auth.body_content_type.clone(),
                    extra_headers: auth.extra_headers.clone(),
                    token_path: auth.token_path.clone(),
                    token_placement: auth.token_placement.clone(),
                    ws_token_placement: auth.ws_token_placement.clone(),
                },
            )
            .await?;

            if auth.access_token.is_some() {
                auth_repository::set_access_token(
                    &state.db,
                    &created.id,
                    auth.access_token.as_deref(),
                )
                .await?;
            }
            if !auth.auth_cookies.is_empty() {
                auth_repository::set_auth_cookies(
                    &state.db,
                    &created.id,
                    &auth.auth_cookies,
                    &auth.auth_cookie_host,
                )
                .await?;
            }
        }

        if let Some(proxy) = &env.proxy {
            proxy_repository::upsert(
                &state.db,
                &UpdateEnvironmentProxyDTO {
                    environment_id: created.id.clone(),
                    enabled: proxy.enabled,
                    url: proxy.url.clone(),
                    username: proxy.username.clone(),
                    password: proxy.password.clone(),
                    bypass: proxy.bypass.clone(),
                    insecure: proxy.insecure,
                    timeout_ms: proxy.timeout_ms,
                },
            )
            .await?;
        }
    }

    Ok(())
}

/// Заводит один узел вместе с его содержимым и возвращает свежий id. Каталог,
/// markdown и пустые оболочки doc-api/doc-ws/doc-erd идут тем же путём
/// создания, что и ручное добавление узла (`create_tree_node`) — как и у
/// одиночного JSON-импорта каждого вида; файл — особый случай: у него нет
/// пути на диске, только байты из архива.
async fn import_node(
    state: &AppState,
    platform_id: &str,
    parent_id: Option<String>,
    node: &ManifestNode,
    archive: &ImportedArchive,
) -> Result<String, String> {
    match node.kind {
        NodeKind::Catalog => {
            let created = create_tree_node(
                state,
                &CreateNodeDTO {
                    id: None,
                    platform_id: platform_id.to_string(),
                    parent_id,
                    name: node.name.clone(),
                    payload: NodePayload::Catalog,
                },
            )
            .await?;
            Ok(created.id)
        }
        NodeKind::Markdown => {
            let created = create_tree_node(
                state,
                &CreateNodeDTO {
                    id: None,
                    platform_id: platform_id.to_string(),
                    parent_id,
                    name: node.name.clone(),
                    payload: NodePayload::Markdown {
                        content: node.content.clone().unwrap_or_default(),
                    },
                },
            )
            .await?;
            Ok(created.id)
        }
        NodeKind::DocApi => import_doc_api_node(state, platform_id, parent_id, node).await,
        NodeKind::DocWs => import_doc_ws_node(state, platform_id, parent_id, node).await,
        NodeKind::DocErd => import_doc_erd_node(state, platform_id, parent_id, node).await,
        NodeKind::File => import_file_node(state, platform_id, parent_id, node, archive).await,
    }
}

async fn import_doc_api_node(
    state: &AppState,
    platform_id: &str,
    parent_id: Option<String>,
    node: &ManifestNode,
) -> Result<String, String> {
    let doc_api = node
        .doc_api
        .as_ref()
        .ok_or_else(|| format!("узел «{}»: в архиве нет данных doc-api", node.name))?;

    let created = create_tree_node(
        state,
        &CreateNodeDTO {
            id: None,
            platform_id: platform_id.to_string(),
            parent_id,
            name: node.name.clone(),
            payload: NodePayload::DocApi {
                prefix: doc_api.prefix.clone(),
            },
        },
    )
    .await?;

    let groups: Vec<CreateGroupDTO> = doc_api
        .groups
        .iter()
        .map(|group| CreateGroupDTO {
            label: group.label.clone(),
            endpoints: group
                .endpoints
                .iter()
                .map(|endpoint| CreateEndpointDTO {
                    method: endpoint.method.clone(),
                    path: endpoint.path.clone(),
                    name: endpoint.name.clone(),
                    description: endpoint.description.clone(),
                    auth: endpoint.auth,
                    path_params: endpoint.path_params.clone(),
                    query_params: endpoint.query_params.clone(),
                    header_params: endpoint.header_params.clone(),
                    cookie_params: endpoint.cookie_params.clone(),
                    body: endpoint.body.clone(),
                    body_fields: endpoint.body_fields.clone(),
                    body_params: Vec::new(),
                    responses: endpoint.responses.clone(),
                    requests: endpoint
                        .requests
                        .iter()
                        .map(|request| ImportEndpointRequestDTO {
                            name: request.name.clone(),
                            body_mode: request.body_mode,
                            body: request.body.clone(),
                            headers: request.headers.clone(),
                            cookies: request.cookies.clone(),
                            path: Default::default(),
                            query: Default::default(),
                            values: request.values.clone(),
                        })
                        .collect(),
                })
                .collect(),
        })
        .collect();

    GroupRepo::new(&state.db)
        .create(&created.id, &groups)
        .await?;

    Ok(created.id)
}

async fn import_doc_ws_node(
    state: &AppState,
    platform_id: &str,
    parent_id: Option<String>,
    node: &ManifestNode,
) -> Result<String, String> {
    let doc_ws = node
        .doc_ws
        .as_ref()
        .ok_or_else(|| format!("узел «{}»: в архиве нет данных websocket", node.name))?;

    let created = create_tree_node(
        state,
        &CreateNodeDTO {
            id: None,
            platform_id: platform_id.to_string(),
            parent_id,
            name: node.name.clone(),
            payload: NodePayload::DocWs {
                url: doc_ws.url.clone(),
            },
        },
    )
    .await?;

    let messages = WebsocketMessageRepo::new(&state.db);
    for message in &doc_ws.messages {
        messages
            .create(&CreateWebsocketMessageDTO {
                websocket_id: created.id.clone(),
                name: message.name.clone(),
                payload: message.payload.clone(),
                desc: message.desc.clone(),
            })
            .await?;
    }

    Ok(created.id)
}

async fn import_doc_erd_node(
    state: &AppState,
    platform_id: &str,
    parent_id: Option<String>,
    node: &ManifestNode,
) -> Result<String, String> {
    let doc_erd = node
        .doc_erd
        .as_ref()
        .ok_or_else(|| format!("узел «{}»: в архиве нет данных ERD", node.name))?;

    let created = create_tree_node(
        state,
        &CreateNodeDTO {
            id: None,
            platform_id: platform_id.to_string(),
            parent_id,
            name: node.name.clone(),
            payload: NodePayload::DocErd,
        },
    )
    .await?;

    let entities = EntityRepo::new(&state.db);
    let mut entity_id_of: HashMap<&str, String> = HashMap::new();
    let mut positions = Vec::new();

    for entity in &doc_erd.entities {
        let new_id = entities
            .create_for_erd(
                &created.id,
                &CreateEntityDTO {
                    name: entity.name.clone(),
                    desc: entity.desc.clone(),
                    fields: entity.fields.clone(),
                },
            )
            .await?;

        // `None` — таблицу ещё не размещали, холст сам разложит её
        // автолейаутом; подставлять `0,0` в этом случае нельзя.
        if let (Some(x), Some(y)) = (entity.pos_x, entity.pos_y) {
            positions.push(EntityPositionDTO {
                id: new_id.clone(),
                x,
                y,
            });
        }

        entity_id_of.insert(entity.id.as_str(), new_id);
    }

    entities.update_positions(&positions).await?;

    let relations = RelationRepo::new(&state.db);
    for relation in &doc_erd.relations {
        let from_entity = entity_id_of
            .get(relation.from_entity.as_str())
            .cloned()
            .ok_or_else(|| {
                "импорт платформы: связь ссылается на неизвестную таблицу".to_string()
            })?;
        let to_entity = entity_id_of
            .get(relation.to_entity.as_str())
            .cloned()
            .ok_or_else(|| {
                "импорт платформы: связь ссылается на неизвестную таблицу".to_string()
            })?;

        relations
            .create(&RelationEndpointsDTO {
                from_entity,
                from_field: relation.from_field.clone(),
                to_entity,
                to_field: relation.to_field.clone(),
            })
            .await?;
    }

    // Области ни на что не ссылаются: их место на холсте — просто координаты,
    // и переносятся они как есть, вместе с положением таблиц.
    let frames = FrameRepo::new(&state.db);
    for frame in &doc_erd.frames {
        frames
            .create_for_erd(
                &created.id,
                &CreateFrameDTO {
                    title: frame.title.clone(),
                    x: frame.x,
                    y: frame.y,
                    w: frame.w,
                    h: frame.h,
                },
            )
            .await?;
    }

    Ok(created.id)
}

async fn import_file_node(
    state: &AppState,
    platform_id: &str,
    parent_id: Option<String>,
    node: &ManifestNode,
    archive: &ImportedArchive,
) -> Result<String, String> {
    let file_meta = node
        .file
        .as_ref()
        .ok_or_else(|| format!("узел «{}»: в архиве нет данных файла", node.name))?;

    // У файлового узла нет пути на диске (в отличие от `NodePayload::File`,
    // которым заводит узел ручная загрузка) — байты приезжают из архива,
    // поэтому узел и содержимое заводятся напрямую через репозитории, минуя
    // `create_tree_node`.
    let created = CatalogRepo::new(&state.db)
        .create(&NewNode {
            platform_id,
            parent_id: parent_id.as_deref(),
            kind: NodeKind::File,
            name: &node.name,
        })
        .await?;

    let zip_path = format!("files/{}/{}", node.id, file_meta.filename);
    let bytes = archive
        .files
        .get(&zip_path)
        .ok_or_else(|| format!("узел «{}»: файл не найден в архиве", node.name))?;

    let stored = FileRepo::new(&state.files_dir)
        .store_bytes(&created.id, &file_meta.filename, bytes)
        .await?;

    DocFileRepo::new(&state.db)
        .create(&created.id, &stored)
        .await?;

    Ok(created.id)
}

/// Порядок обхода узлов «родитель раньше детей» — BFS от корня платформы.
/// `CatalogRepo::tree` при экспорте отдаёт узлы по алфавиту, а не по вложению,
/// поэтому на порядок массива в манифесте полагаться нельзя.
fn order_for_import(nodes: &[ManifestNode]) -> Result<Vec<&ManifestNode>, String> {
    let mut children_of: HashMap<Option<&str>, Vec<&ManifestNode>> = HashMap::new();
    for node in nodes {
        children_of
            .entry(node.parent_id.as_deref())
            .or_default()
            .push(node);
    }

    let mut ordered = Vec::with_capacity(nodes.len());
    let mut queue: VecDeque<Option<&str>> = VecDeque::from([None]);

    while let Some(key) = queue.pop_front() {
        for child in children_of.remove(&key).unwrap_or_default() {
            queue.push_back(Some(child.id.as_str()));
            ordered.push(child);
        }
    }

    if ordered.len() != nodes.len() {
        return Err("импорт платформы: в архиве есть узел с недостижимым parentId".to_string());
    }

    Ok(ordered)
}
