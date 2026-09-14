use serde::{Deserialize, Serialize};

/// Документированное WebSocket-подключение. Имя живёт в узле дерева
/// (`catalog_node`), здесь — адрес; `id` у узла и документа общий. Примеры
/// кадров ссылаются на него через `websocket_message.websocket_id`.
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DocWebsocket {
    pub id: String,
    pub name: String,
    /// `ws://` или `wss://` адрес подключения.
    pub url: String,
}
