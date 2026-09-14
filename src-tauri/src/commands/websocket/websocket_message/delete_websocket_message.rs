use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn delete_websocket_message(
    state: State<'_, AppState>,
    message_id: String,
) -> Result<(), String> {
    crate::logging::logged(
        "delete_websocket_message",
        crate::service::delete_websocket_message(&state, message_id).await,
    )
}
