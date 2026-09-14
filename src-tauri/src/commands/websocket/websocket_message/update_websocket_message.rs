use crate::domain::websocket::message::dto::UpdateWebsocketMessageDTO;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn update_websocket_message(
    state: State<'_, AppState>,
    message: UpdateWebsocketMessageDTO,
) -> Result<(), String> {
    crate::logging::logged(
        "update_websocket_message",
        crate::service::update_websocket_message(&state, message).await,
    )
}
