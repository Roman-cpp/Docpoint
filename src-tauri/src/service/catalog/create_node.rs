use crate::domain::catalog::dto::{CreateNodeDTO, NewNode, NodePayload};
use crate::domain::catalog::entity::CatalogNode;
use crate::domain::catalog::repository::CatalogRepository;
use crate::domain::content::repository::ContentRepository;
use crate::domain::doc_api::doc_api::dto::DocApiPayload;
use crate::domain::doc_api::doc_api::repository::DocApiRepository;
use crate::domain::doc_erd::doc_erd::repository::DocErdRepository;
use crate::domain::file::repository::{DocFileRepository, FileAssetRepository};
use crate::domain::websocket::doc_websocket::repository::DocWebsocketRepository;
use crate::repository::filesystem::content::ContentRepo;
use crate::repository::filesystem::file::FileRepo;
use crate::repository::sqlite::catalog::CatalogRepo;
use crate::repository::sqlite::doc_api::DocApiRepo;
use crate::repository::sqlite::doc_erd::DocErdRepo;
use crate::repository::sqlite::doc_file::DocFileRepo;
use crate::repository::sqlite::doc_websocket::DocWebsocketRepo;
use crate::state::AppState;
use std::path::Path;
use tauri::State;

/// Создать каталог или документ любого вида. Вид определяется полезной
/// нагрузкой, поэтому команда одна на все пять видов узлов.
#[tauri::command]
pub async fn create_node(
    state: State<'_, AppState>,
    node: CreateNodeDTO,
) -> Result<CatalogNode, String> {
    create_tree_node(&state, &node).await
}

/// Узел плюс его полезная нагрузка. Если нагрузка не записалась, узел
/// удаляется: иначе в дереве осталась бы карточка документа, который нельзя
/// открыть.
pub async fn create_tree_node(
    state: &AppState,
    dto: &CreateNodeDTO,
) -> Result<CatalogNode, String> {
    let catalog = CatalogRepo::new(&state.db);

    let created = catalog
        .create(&NewNode {
            platform_id: &dto.platform_id,
            parent_id: dto.parent_id.as_deref(),
            kind: dto.payload.kind(),
            name: &dto.name,
        })
        .await?;

    if let Err(error) = write_payload(state, &created.id, &dto.payload).await {
        // Ошибка отката не должна подменять собой настоящую причину.
        let _ = catalog.delete(&created.id).await;
        return Err(error);
    }

    Ok(created)
}

async fn write_payload(
    state: &AppState,
    id: &str,
    payload: &NodePayload,
) -> Result<(), String> {
    match payload {
        // Каталог — это сам узел: собственных полей у него нет.
        NodePayload::Catalog => Ok(()),
        // У диаграммы своих полей тоже нет, но строка ей нужна: к ней цепляются
        // сущности.
        NodePayload::DocErd => DocErdRepo::new(&state.db).create(id).await,
        NodePayload::DocApi { prefix } => {
            DocApiRepo::new(&state.db)
                .create(
                    id,
                    &DocApiPayload {
                        prefix: prefix.clone(),
                    },
                )
                .await
        }
        NodePayload::DocWs { url } => DocWebsocketRepo::new(&state.db).create(id, url).await,
        NodePayload::Markdown { content } => {
            ContentRepo::new(&state.content_dir).write(id, content).await
        }
        NodePayload::File { source_path } => {
            let files = FileRepo::new(&state.files_dir);
            let stored = files.store(id, Path::new(source_path)).await?;

            // Строки нет — файл в хранилище не найти: узел откатится, а его
            // каталог остался бы там мусором.
            if let Err(error) = DocFileRepo::new(&state.db).create(id, &stored).await {
                let _ = files.delete(id).await;
                return Err(error);
            }

            Ok(())
        }
    }
}
