use crate::domain::websocket::message::entity::WebsocketMessage;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn read_websocket_messages(
    state: State<'_, AppState>,
    websocket_id: String,
) -> Result<Vec<WebsocketMessage>, String> {
    crate::logging::logged(
        "read_websocket_messages",
        crate::service::read_websocket_messages(&state, websocket_id).await,
    )
}
