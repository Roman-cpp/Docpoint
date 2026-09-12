use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn ws_disconnect(state: State<'_, AppState>, id: String) -> Result<(), String> {
    crate::logging::logged(
        "ws_disconnect",
        crate::service::ws_disconnect(&state, id).await,
    )
}
