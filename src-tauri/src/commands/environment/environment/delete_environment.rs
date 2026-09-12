use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn delete_environment(state: State<'_, AppState>, id: String) -> Result<(), String> {
    crate::logging::logged(
        "delete_environment",
        crate::service::delete_environment(&state, id).await,
    )
}
