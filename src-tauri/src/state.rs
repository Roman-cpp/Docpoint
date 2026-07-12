use dashmap::DashMap;
use sqlx::SqlitePool;
use std::path::PathBuf;
use std::sync::Mutex;
use tokio::sync::mpsc::UnboundedSender;
use tokio::task::JoinHandle;
use tokio_tungstenite::tungstenite::Message;

/// A live WebSocket connection owned by the backend.
///
/// Outgoing frames are pushed onto `tx`, drained by the writer task.
/// `handle` is the reader task; aborting it (and dropping `tx`) tears the
/// connection down.
pub struct WsConn {
    pub tx: UnboundedSender<Message>,
    pub handle: JoinHandle<()>,
}

pub struct AppState {
    pub db: SqlitePool,
    pub selected_environment_id: Mutex<Option<String>>,
    /// Directory holding markdown bodies of docs, one `<id>.md` file per doc.
    pub vault_dir: PathBuf,
    /// Live WebSocket connections keyed by connection id.
    pub ws_conns: DashMap<String, WsConn>,
    /// Shared HTTP client with a cookie jar that lives for the app session,
    /// so `Set-Cookie` from an auth request is replayed on later requests.
    pub http_client: reqwest::Client,
}
