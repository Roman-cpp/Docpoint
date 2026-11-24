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

/// Итог импорта сокета. Документ выбирает сам файл — по своему `id`, — поэтому
/// в отчёте есть и он: пользователь не указывал, куда лить, и должен увидеть,
/// куда прилетело и завели ли сокет заново.
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportWebsocketReport {
    pub doc_id: String,
    pub doc_name: String,
    /// `true` — сокета с таким id не было, и он заведён этим импортом.
    pub created: bool,
    pub messages_added: usize,
    pub messages_updated: usize,
}
