use crate::domain::websocket::doc_websocket::dto::CreateDocWebsocketDTO;
use crate::domain::websocket::doc_websocket::repository::DocWebsocketRepository;
use crate::repository::sqlite::doc_websocket::DocWebsocketRepo;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn create_websocket(
    state: State<'_, AppState>,
    websocket: CreateDocWebsocketDTO,
) -> Result<String, String> {
    DocWebsocketRepo::new(&state.db).create(&websocket).await
}
