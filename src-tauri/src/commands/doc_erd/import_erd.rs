use crate::domain::catalog::dto::CreateNodeDTO;
use crate::domain::doc_erd::import::dto::{ImportRelationDTO, ImportTableDTO};
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn import_erd(
    state: State<'_, AppState>,
    node: CreateNodeDTO,
    tables: Vec<ImportTableDTO>,
    relations: Vec<ImportRelationDTO>,
) -> Result<String, String> {
    crate::logging::logged(
        "import_erd",
        crate::service::import_erd(&state, node, tables, relations).await,
    )
}
