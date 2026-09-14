use crate::domain::websocket::message::dto::CreateWebsocketMessageDTO;
use crate::domain::websocket::message::repository::WebsocketMessageRepository;
use crate::repository::sqlite::websocket_message::WebsocketMessageRepo;
use crate::state::AppState;

pub async fn create_websocket_message(
    state: &AppState,
    message: CreateWebsocketMessageDTO,
) -> Result<String, String> {
    WebsocketMessageRepo::new(&state.db).create(&message).await
}
