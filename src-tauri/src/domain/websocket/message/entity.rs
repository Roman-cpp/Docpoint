use serde::{Deserialize, Serialize};

/// A documented example frame for a socket ("Subscribe", "Ping", "Auth", …).
/// Stored in `websocket_message`, owned by a `doc_websockets` row.
#[derive(Debug, Serialize, Deserialize)]
pub struct WebsocketMessage {
    pub id: String,
    pub websocket_id: String,
    pub name: String,
    /// JSON (or raw) payload template.
    pub payload: String,
    pub desc: String,
}
