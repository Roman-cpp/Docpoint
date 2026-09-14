use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn clear_environment_session(
    state: State<'_, AppState>,
    environment_id: String,
) -> Result<(), String> {
    crate::logging::logged(
        "clear_environment_session",
        crate::service::clear_environment_session(&state, environment_id).await,
    )
}
