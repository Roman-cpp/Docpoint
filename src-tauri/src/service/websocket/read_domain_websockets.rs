use crate::domain::websocket::doc_websocket::entity::DocWebsocket;
use crate::domain::websocket::doc_websocket::repository::DocWebsocketRepository;
use crate::repository::sqlite::doc_websocket::DocWebsocketRepo;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn read_domain_websockets(
    state: State<'_, AppState>,
    domain_id: String,
) -> Result<Vec<DocWebsocket>, String> {
    DocWebsocketRepo::new(&state.db).by_domain(&domain_id).await
}
