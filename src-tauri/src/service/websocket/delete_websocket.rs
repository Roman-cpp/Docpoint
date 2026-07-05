use crate::domain::websocket::doc_websocket::repository::DocWebsocketRepository;
use crate::repository::sqlite::doc_websocket::DocWebsocketRepo;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn delete_websocket(
    state: State<'_, AppState>,
    websocket_id: String,
) -> Result<(), String> {
    DocWebsocketRepo::new(&state.db).delete(&websocket_id).await
}
