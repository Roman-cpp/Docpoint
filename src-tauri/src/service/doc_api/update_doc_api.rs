use crate::domain::catalog::dto::RenameNodeDTO;
use crate::domain::catalog::repository::CatalogRepository;
use crate::domain::doc_api::doc_api::dto::{DocApiPayload, UpdateDocApiDTO};
use crate::domain::doc_api::doc_api::repository::DocApiRepository;
use crate::repository::sqlite::catalog::CatalogRepo;
use crate::repository::sqlite::doc_api::DocApiRepo;
use crate::state::AppState;
use tauri::State;

/// Имя документа лежит в узле дерева, префикс — в его полезной нагрузке,
/// поэтому правка идёт в две таблицы.
#[tauri::command]
pub async fn update_doc(
    state: State<'_, AppState>,
    doc: UpdateDocApiDTO,
) -> Result<String, String> {
    CatalogRepo::new(&state.db)
        .rename(&RenameNodeDTO {
            id: doc.id.clone(),
            name: doc.name.clone(),
        })
        .await?;

    DocApiRepo::new(&state.db)
        .update(
            &doc.id,
            &DocApiPayload {
                prefix: doc.prefix,
            },
        )
        .await?;

    Ok(doc.id)
}
