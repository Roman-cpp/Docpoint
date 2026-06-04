use sqlx::SqlitePool;
use std::sync::Mutex;

pub struct AppState {
    pub db: SqlitePool,
    pub selected_environment_id: Mutex<Option<String>>,
}
