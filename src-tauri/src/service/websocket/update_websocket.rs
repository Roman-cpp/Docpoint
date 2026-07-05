use crate::domain::websocket::doc_websocket::dto::UpdateDocWebsocketDTO;
use crate::domain::websocket::doc_websocket::repository::DocWebsocketRepository;
use crate::repository::sqlite::doc_websocket::DocWebsocketRepo;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn update_websocket(
    state: State<'_, AppState>,
    websocket: UpdateDocWebsocketDTO,
) -> Result<(), String> {
    DocWebsocketRepo::new(&state.db).update(&websocket).await
}
