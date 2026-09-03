use crate::domain::websocket::message::entity::WebsocketMessage;
use crate::domain::websocket::message::repository::WebsocketMessageRepository;
use crate::repository::sqlite::websocket_message::WebsocketMessageRepo;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn read_websocket_messages(
    state: State<'_, AppState>,
    websocket_id: String,
) -> Result<Vec<WebsocketMessage>, String> {
    crate::logging::logged("read_websocket_messages", async {
        WebsocketMessageRepo::new(&state.db)
            .by_websocket(&websocket_id)
            .await
    }
    .await)
}
