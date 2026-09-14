use crate::domain::doc_erd::entity::entity::Entity;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn read_erd_schemas(
    state: State<'_, AppState>,
    doc_erd_id: String,
) -> Result<Vec<Entity>, String> {
    crate::logging::logged(
        "read_erd_schemas",
        crate::service::read_erd_schemas(&state, doc_erd_id).await,
    )
}
