#[tauri::command]
pub async fn save_json_file(content: String, filename: String) -> Result<bool, String> {
    crate::logging::logged(
        "save_json_file",
        crate::service::save_json_file(content, filename).await,
    )
}
