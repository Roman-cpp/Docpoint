#[tauri::command]
pub async fn export_markdown(content: String, filename: String) -> Result<bool, String> {
    crate::logging::logged(
        "export_markdown",
        crate::service::export_markdown(content, filename).await,
    )
}
