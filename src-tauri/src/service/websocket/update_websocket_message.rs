use crate::domain::websocket::message::dto::UpdateWebsocketMessageDTO;
use crate::domain::websocket::message::repository::WebsocketMessageRepository;
use crate::repository::sqlite::websocket_message::WebsocketMessageRepo;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn update_websocket_message(
    state: State<'_, AppState>,
    message: UpdateWebsocketMessageDTO,
) -> Result<(), String> {
    WebsocketMessageRepo::new(&state.db).update(&message).await
}
