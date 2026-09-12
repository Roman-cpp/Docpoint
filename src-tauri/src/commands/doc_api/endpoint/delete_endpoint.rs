use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn delete_endpoint(
    state: State<'_, AppState>,
    endpoint_id: String,
) -> Result<(), String> {
    crate::logging::logged(
        "delete_endpoint",
        crate::service::delete_endpoint(&state, endpoint_id).await,
    )
}
