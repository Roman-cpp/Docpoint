use crate::domain::websocket::doc_websocket::entity::DocWebsocket;
use crate::domain::websocket::doc_websocket::repository::DocWebsocketRepository;
use crate::repository::sqlite::doc_websocket::DocWebsocketRepo;
use crate::state::AppState;

/// Все документированные сокеты — список для ws-клиента, которому дерево не
/// нужно: он выбирает подключение, а не место в каталоге.
pub async fn read_websockets(state: &AppState) -> Result<Vec<DocWebsocket>, String> {
    DocWebsocketRepo::new(&state.db).all().await
}

/// Один сокет по id — страница doc-ws открывается по ссылке и знает только его.
pub async fn read_websocket(state: &AppState, id: String) -> Result<Option<DocWebsocket>, String> {
    DocWebsocketRepo::new(&state.db).find(&id).await
}
