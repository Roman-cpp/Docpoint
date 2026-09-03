use crate::domain::websocket::doc_websocket::entity::DocWebsocket;
use crate::domain::websocket::doc_websocket::repository::DocWebsocketRepository;
use crate::repository::sqlite::doc_websocket::DocWebsocketRepo;
use crate::state::AppState;
use tauri::State;

/// Все документированные сокеты — список для ws-клиента, которому дерево не
/// нужно: он выбирает подключение, а не место в каталоге.
#[tauri::command]
pub async fn read_websockets(state: State<'_, AppState>) -> Result<Vec<DocWebsocket>, String> {
    crate::logging::logged(
        "read_websockets",
        async { DocWebsocketRepo::new(&state.db).all().await }.await,
    )
}

/// Один сокет по id — страница doc-ws открывается по ссылке и знает только его.
#[tauri::command]
pub async fn read_websocket(
    state: State<'_, AppState>,
    id: String,
) -> Result<Option<DocWebsocket>, String> {
    crate::logging::logged(
        "read_websocket",
        async { DocWebsocketRepo::new(&state.db).find(&id).await }.await,
    )
}
