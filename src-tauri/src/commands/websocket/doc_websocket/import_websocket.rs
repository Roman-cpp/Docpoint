use crate::domain::catalog::dto::CreateNodeDTO;
use crate::domain::websocket::doc_websocket::entity::ImportWebsocketReport;
use crate::domain::websocket::message::dto::ImportWebsocketMessageDTO;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn import_websocket(
    state: State<'_, AppState>,
    node: CreateNodeDTO,
    messages: Vec<ImportWebsocketMessageDTO>,
) -> Result<ImportWebsocketReport, String> {
    crate::logging::logged(
        "import_websocket",
        crate::service::import_websocket(&state, node, messages).await,
    )
}
