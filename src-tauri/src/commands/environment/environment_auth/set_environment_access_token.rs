use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn set_environment_access_token(
    state: State<'_, AppState>,
    environment_id: String,
    token: Option<String>,
) -> Result<(), String> {
    crate::logging::logged(
        "set_environment_access_token",
        crate::service::set_environment_access_token(&state, environment_id, token).await,
    )
}
