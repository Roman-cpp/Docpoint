use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn set_selected_environment(
    state: State<'_, AppState>,
    environment_id: Option<String>,
) -> Result<(), String> {
    crate::logging::logged(
        "set_selected_environment",
        crate::service::set_selected_environment(&state, environment_id).await,
    )
}
