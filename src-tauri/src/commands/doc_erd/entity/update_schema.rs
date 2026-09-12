use crate::domain::doc_erd::entity::dto::UpdateEntityDTO;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn update_schema(
    state: State<'_, AppState>,
    schema: UpdateEntityDTO,
) -> Result<(), String> {
    crate::logging::logged(
        "update_schema",
        crate::service::update_schema(&state, schema).await,
    )
}
