use dashmap::DashMap;
use sqlx::SqlitePool;
use std::path::PathBuf;
use std::sync::Mutex;
use tokio::sync::mpsc::UnboundedSender;
use tokio::task::JoinHandle;
use tokio_tungstenite::tungstenite::Message;

use crate::infrastructure::http_client::ClientPool;

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
    /// Тела документов, по файлу `<node_id>.md` на узел: обзорная часть doc-api
    /// и markdown-документы. Имя и место документа задаёт дерево в БД, поэтому
    /// на диске лежат только тела и переименование их не касается.
    pub content_dir: PathBuf,
    /// Загруженные файлы, по каталогу `<node_id>/` на узел: внутри лежит сам
    /// файл под своим именем. Открывает его установленная в системе программа,
    /// поэтому имя вместе с расширением важно сохранить.
    pub files_dir: PathBuf,
    /// Live WebSocket connections keyed by connection id.
    pub ws_conns: DashMap<String, WsConn>,
    /// HTTP-клиенты приложения: прямой и по одному на настройку прокси.
    /// Прокси принадлежит окружению, а reqwest задаёт его на клиенте, поэтому
    /// клиент выбирается на каждый запрос — см.
    /// [`ClientPool::get`](crate::infrastructure::http_client::ClientPool::get).
    pub http_clients: ClientPool,
}
