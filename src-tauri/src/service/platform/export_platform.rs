use std::io::Write;

use crate::domain::catalog::entity::NodeKind;
use crate::domain::catalog::repository::CatalogRepository;
use crate::domain::content::repository::ContentRepository;
use crate::domain::doc_api::doc_api::repository::DocApiRepository;
use crate::domain::doc_api::endpoint_request::repository::EndpointRequestRepository;
use crate::domain::doc_api::group::repository::GroupRepository;
use crate::domain::doc_erd::entity::repository::EntityRepository;
use crate::domain::doc_erd::entity_relation::repository::RelationRepository;
use crate::domain::doc_erd::frame::repository::FrameRepository;
use crate::domain::environment::environment_auth::repository as auth_repository;
use crate::domain::environment::environment_proxy::repository as proxy_repository;
use crate::domain::file::repository::DocFileRepository;
use crate::domain::platform::repository::PlatformRepository;
use crate::domain::websocket::doc_websocket::repository::DocWebsocketRepository;
use crate::domain::websocket::message::repository::WebsocketMessageRepository;
use crate::repository::filesystem::content::ContentRepo;
use crate::repository::sqlite::catalog::CatalogRepo;
use crate::repository::sqlite::doc_api::DocApiRepo;
use crate::repository::sqlite::doc_file::DocFileRepo;
use crate::repository::sqlite::doc_websocket::DocWebsocketRepo;
use crate::repository::sqlite::endpoint_request::EndpointRequestRepo;
use crate::repository::sqlite::entity::EntityRepo;
use crate::repository::sqlite::entity_relation::RelationRepo;
use crate::repository::sqlite::erd_frame::FrameRepo;
use crate::repository::sqlite::group::GroupRepo;
use crate::repository::sqlite::platform::PlatformRepo;
use crate::repository::sqlite::websocket_message::WebsocketMessageRepo;
use crate::state::AppState;

use super::manifest::{
    Manifest, ManifestDocApi, ManifestDocErd, ManifestDocWs, ManifestEndpoint,
    ManifestEndpointRequest, ManifestEnvironment, ManifestFile, ManifestGroup, ManifestNode,
    ManifestPlatform, ManifestWebsocketMessage,
};

/// Экспортирует платформу целиком в zip-архив: манифест со всем деревом
/// документов и окружениями плюс байты загруженных файлов. Показывает
/// системный диалог сохранения; `Ok(false)` — пользователь отменил выбор.
pub async fn export_platform(state: &AppState, platform_id: String) -> Result<bool, String> {
    let platforms = PlatformRepo::new(&state.db);
    let platform = platforms
        .find_by_id(&platform_id)
        .await?
        .ok_or_else(|| "платформа не найдена".to_string())?;

    let environments = export_environments(state, &platform_id).await?;
    let (nodes, file_entries) = export_nodes(state, &platform_id).await?;

    let manifest = Manifest {
        version: 1,
        platform: ManifestPlatform {
            name: platform.name.clone(),
            desc: platform.desc.clone(),
        },
        environments,
        nodes,
    };

    let manifest_json = serde_json::to_string_pretty(&manifest).map_err(|e| e.to_string())?;
    let filename = format!(
        "{}.zip",
        platform.name.trim().replace(char::is_whitespace, "_")
    );

    let Some(path) = tokio::task::spawn_blocking(move || {
        rfd::FileDialog::new()
            .set_file_name(&filename)
            .add_filter("Docpoint платформа", &["zip"])
            .save_file()
    })
    .await
    .map_err(|e| e.to_string())?
    else {
        return Ok(false);
    };

    tokio::task::spawn_blocking(move || write_zip(&path, &manifest_json, &file_entries))
        .await
        .map_err(|e| e.to_string())??;

    Ok(true)
}

async fn export_environments(
    state: &AppState,
    platform_id: &str,
) -> Result<Vec<ManifestEnvironment>, String> {
    let mut environments = Vec::new();

    for env in PlatformRepo::new(&state.db)
        .environments_by_platform(platform_id)
        .await?
    {
        let auth = auth_repository::read_by_env_id(&state.db, &env.id).await?;
        let proxy = proxy_repository::read_by_env_id(&state.db, &env.id).await?;

        environments.push(ManifestEnvironment {
            env: env.env,
            label: env.label,
            base_url: env.base_url,
            prefix: env.prefix,
            variables: env.value,
            auth,
            proxy,
        });
    }

    Ok(environments)
}

/// Все узлы платформы вместе с полезной нагрузкой каждого вида; для
/// файловых узлов дополнительно — байты, которые лягут в архив рядом с
/// манифестом.
async fn export_nodes(
    state: &AppState,
    platform_id: &str,
) -> Result<(Vec<ManifestNode>, Vec<(String, Vec<u8>)>), String> {
    let tree = CatalogRepo::new(&state.db).tree(platform_id).await?;

    let mut nodes = Vec::with_capacity(tree.len());
    let mut file_entries = Vec::new();

    for node in tree {
        let mut manifest_node = ManifestNode {
            id: node.id.clone(),
            parent_id: node.parent_id.clone(),
            kind: node.kind,
            name: node.name.clone(),
            content: None,
            file: None,
            doc_api: None,
            doc_ws: None,
            doc_erd: None,
        };

        match node.kind {
            NodeKind::Catalog => {}
            NodeKind::Markdown => {
                manifest_node.content =
                    Some(ContentRepo::new(&state.content_dir).read(&node.id).await?);
            }
            NodeKind::DocApi => {
                manifest_node.doc_api = Some(export_doc_api(state, &node.id).await?);
            }
            NodeKind::DocWs => {
                manifest_node.doc_ws = Some(export_doc_ws(state, &node.id).await?);
            }
            NodeKind::DocErd => {
                manifest_node.doc_erd = Some(export_doc_erd(state, &node.id).await?);
            }
            NodeKind::File => {
                if let Some(entry) = export_file(state, &node.id).await? {
                    manifest_node.file = Some(ManifestFile {
                        filename: entry.0.clone(),
                    });
                    file_entries.push((format!("files/{}/{}", node.id, entry.0), entry.1));
                }
            }
        }

        nodes.push(manifest_node);
    }

    Ok((nodes, file_entries))
}

async fn export_doc_api(state: &AppState, node_id: &str) -> Result<ManifestDocApi, String> {
    let doc = DocApiRepo::new(&state.db)
        .find(node_id)
        .await?
        .ok_or_else(|| format!("doc-api не найден: {node_id}"))?;

    let request_repo = EndpointRequestRepo::new(&state.db);
    let mut groups = Vec::new();

    for group in GroupRepo::new(&state.db).all(node_id).await? {
        let mut endpoints = Vec::with_capacity(group.endpoints.len());

        for endpoint in group.endpoints {
            let requests = request_repo
                .list(&endpoint.id)
                .await?
                .into_iter()
                .map(|r| ManifestEndpointRequest {
                    name: r.name,
                    body_mode: r.body_mode,
                    body: r.body,
                    headers: r.headers,
                    cookies: r.cookies,
                    values: r.values,
                })
                .collect();

            endpoints.push(ManifestEndpoint {
                method: endpoint.method,
                path: endpoint.path,
                name: endpoint.name,
                description: endpoint.description,
                auth: endpoint.auth,
                path_params: endpoint.path_params,
                query_params: endpoint.query_params,
                header_params: endpoint.header_params,
                cookie_params: endpoint.cookie_params,
                body: endpoint.body,
                body_fields: endpoint.body_fields,
                body_params: Vec::new(),
                responses: endpoint.responses,
                requests,
            });
        }

        groups.push(ManifestGroup {
            label: group.label,
            endpoints,
        });
    }

    Ok(ManifestDocApi {
        prefix: doc.prefix,
        groups,
    })
}

async fn export_doc_ws(state: &AppState, node_id: &str) -> Result<ManifestDocWs, String> {
    let ws = DocWebsocketRepo::new(&state.db)
        .find(node_id)
        .await?
        .ok_or_else(|| format!("websocket не найден: {node_id}"))?;

    let messages = WebsocketMessageRepo::new(&state.db)
        .by_websocket(node_id)
        .await?
        .into_iter()
        .map(|m| ManifestWebsocketMessage {
            name: m.name,
            payload: m.payload,
            desc: m.desc,
        })
        .collect();

    Ok(ManifestDocWs {
        url: ws.url,
        messages,
    })
}

async fn export_doc_erd(state: &AppState, node_id: &str) -> Result<ManifestDocErd, String> {
    let entities = EntityRepo::new(&state.db).all_by_erd(node_id).await?;
    let relations = RelationRepo::new(&state.db).by_erd(node_id).await?;
    let frames = FrameRepo::new(&state.db).all_by_erd(node_id).await?;

    Ok(ManifestDocErd {
        entities,
        relations,
        frames,
    })
}

/// Имя и байты загруженного файла узла, или `None`, если строка `doc_file`
/// осиротела (не должно происходить, но `write_payload` умеет откатывать
/// файл без строки — на всякий случай экспорт не падает, а пропускает узел).
async fn export_file(state: &AppState, node_id: &str) -> Result<Option<(String, Vec<u8>)>, String> {
    let Some(stored) = DocFileRepo::new(&state.db).find(node_id).await? else {
        return Ok(None);
    };

    let path = state.files_dir.join(node_id).join(&stored.filename);

    match tokio::fs::read(&path).await {
        Ok(bytes) => Ok(Some((stored.filename, bytes))),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => {
            log::warn!("экспорт платформы: файл узла {node_id} не найден на диске: {e}");
            Ok(None)
        }
        Err(e) => Err(e.to_string()),
    }
}

fn write_zip(
    path: &std::path::Path,
    manifest_json: &str,
    file_entries: &[(String, Vec<u8>)],
) -> Result<(), String> {
    let file = std::fs::File::create(path).map_err(|e| e.to_string())?;
    let mut zip = zip::ZipWriter::new(file);
    let options = zip::write::SimpleFileOptions::default();

    zip.start_file("manifest.json", options)
        .map_err(|e| e.to_string())?;
    zip.write_all(manifest_json.as_bytes())
        .map_err(|e| e.to_string())?;

    for (entry_path, bytes) in file_entries {
        zip.start_file(entry_path, options)
            .map_err(|e| e.to_string())?;
        zip.write_all(bytes).map_err(|e| e.to_string())?;
    }

    zip.finish().map_err(|e| e.to_string())?;
    Ok(())
}
