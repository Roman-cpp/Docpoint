use crate::domain::websocket::message::dto::CreateWebsocketMessageDTO;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn create_websocket_message(
    state: State<'_, AppState>,
    message: CreateWebsocketMessageDTO,
) -> Result<String, String> {
    crate::logging::logged(
        "create_websocket_message",
        crate::service::create_websocket_message(&state, message).await,
    )
}
