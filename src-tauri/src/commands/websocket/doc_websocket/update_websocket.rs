use crate::domain::websocket::doc_websocket::dto::UpdateDocWebsocketDTO;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn update_websocket(
    state: State<'_, AppState>,
    websocket: UpdateDocWebsocketDTO,
) -> Result<(), String> {
    crate::logging::logged(
        "update_websocket",
        crate::service::update_websocket(&state, websocket).await,
    )
}
