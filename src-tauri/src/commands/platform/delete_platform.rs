use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn delete_platform(state: State<'_, AppState>, id: String) -> Result<(), String> {
    crate::logging::logged(
        "delete_platform",
        crate::service::delete_platform(&state, id).await,
    )
}
