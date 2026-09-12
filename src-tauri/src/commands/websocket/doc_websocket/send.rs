use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn ws_send(state: State<'_, AppState>, id: String, text: String) -> Result<(), String> {
    crate::logging::logged("ws_send", crate::service::ws_send(&state, id, text).await)
}
