use crate::domain::websocket::message::repository::WebsocketMessageRepository;
use crate::repository::sqlite::websocket_message::WebsocketMessageRepo;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn delete_websocket_message(
    state: State<'_, AppState>,
    message_id: String,
) -> Result<(), String> {
    crate::logging::logged(
        "delete_websocket_message",
        async {
            WebsocketMessageRepo::new(&state.db)
                .delete(&message_id)
                .await
        }
        .await,
    )
}
