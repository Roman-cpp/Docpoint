use crate::domain::doc_erd::entity::dto::CreateEntityDTO;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn create_erd_schema(
    state: State<'_, AppState>,
    doc_erd_id: String,
    schema: CreateEntityDTO,
) -> Result<String, String> {
    crate::logging::logged(
        "create_erd_schema",
        crate::service::create_erd_schema(&state, doc_erd_id, schema).await,
    )
}
