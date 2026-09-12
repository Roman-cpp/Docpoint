#[tauri::command]
pub async fn pick_db_file() -> Result<Option<String>, String> {
    crate::logging::logged("pick_db_file", crate::service::pick_db_file().await)
}
