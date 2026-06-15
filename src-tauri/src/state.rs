use sqlx::SqlitePool;
use std::path::PathBuf;
use std::sync::Mutex;

pub struct AppState {
    pub db: SqlitePool,
    pub selected_environment_id: Mutex<Option<String>>,
    /// Directory holding markdown bodies of docs, one `<id>.md` file per doc.
    pub vault_dir: PathBuf,
}
