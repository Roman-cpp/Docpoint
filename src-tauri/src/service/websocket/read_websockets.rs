use crate::domain::websocket::doc_websocket::entity::DocWebsocket;
use crate::domain::websocket::doc_websocket::repository::DocWebsocketRepository;
use crate::repository::sqlite::doc_websocket::DocWebsocketRepo;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn read_websockets(state: State<'_, AppState>) -> Result<Vec<DocWebsocket>, String> {
    DocWebsocketRepo::new(&state.db).all().await
}
