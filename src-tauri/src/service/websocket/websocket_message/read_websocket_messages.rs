use crate::domain::websocket::message::entity::WebsocketMessage;
use crate::domain::websocket::message::repository::WebsocketMessageRepository;
use crate::repository::sqlite::websocket_message::WebsocketMessageRepo;
use crate::state::AppState;

pub async fn read_websocket_messages(
    state: &AppState,
    websocket_id: String,
) -> Result<Vec<WebsocketMessage>, String> {
    WebsocketMessageRepo::new(&state.db)
        .by_websocket(&websocket_id)
        .await
}
