use crate::domain::websocket::message::dto::CreateWebsocketMessageDTO;
use crate::domain::websocket::message::repository::WebsocketMessageRepository;
use crate::repository::sqlite::websocket_message::WebsocketMessageRepo;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn create_websocket_message(
    state: State<'_, AppState>,
    message: CreateWebsocketMessageDTO,
) -> Result<String, String> {
    crate::logging::logged(
        "create_websocket_message",
        async { WebsocketMessageRepo::new(&state.db).create(&message).await }.await,
    )
}
