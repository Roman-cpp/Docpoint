use serde::Serialize;

/// A single event pushed from the backend to the frontend over the
/// per-connection Tauri event channel `ws://{connection_id}`.
///
/// Frontend stamps its own receive time, so no timestamp is carried here.
#[derive(Debug, Clone, Serialize)]
#[serde(tag = "kind", rename_all = "lowercase")]
pub enum WsEvent {
    /// Handshake finished, socket is ready.
    Open,
    /// A text frame received from the remote peer.
    Message { text: String },
    /// The socket was closed (by peer or by us).
    Closed {
        code: Option<u16>,
        reason: String,
    },
    /// A transport/protocol error terminated the connection.
    Error { message: String },
}
