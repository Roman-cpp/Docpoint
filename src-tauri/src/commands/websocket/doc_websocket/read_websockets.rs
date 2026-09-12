use crate::domain::websocket::doc_websocket::entity::DocWebsocket;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn read_websockets(state: State<'_, AppState>) -> Result<Vec<DocWebsocket>, String> {
    crate::logging::logged(
        "read_websockets",
        crate::service::read_websockets(&state).await,
    )
}

#[tauri::command]
pub async fn read_websocket(
    state: State<'_, AppState>,
    id: String,
) -> Result<Option<DocWebsocket>, String> {
    crate::logging::logged(
        "read_websocket",
        crate::service::read_websocket(&state, id).await,
    )
}
