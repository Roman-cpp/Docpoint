use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn delete_schema(state: State<'_, AppState>, entity_id: String) -> Result<(), String> {
    crate::logging::logged(
        "delete_schema",
        crate::service::delete_schema(&state, entity_id).await,
    )
}
