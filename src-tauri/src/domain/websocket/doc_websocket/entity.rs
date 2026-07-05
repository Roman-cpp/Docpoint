use serde::{Deserialize, Serialize};

/// A documented WebSocket connection: what to connect to and what it is.
/// Stored in `doc_websockets`; example frames point back via
/// `websocket_message.websocket_id`.
#[derive(Debug, Serialize, Deserialize)]
pub struct DocWebsocket {
    pub id: String,
    pub name: String,
    pub desc: String,
    /// `ws://` or `wss://` endpoint to connect to.
    pub url: String,
    pub created_at: String,
}
