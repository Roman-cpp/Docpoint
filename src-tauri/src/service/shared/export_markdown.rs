/// Show a native "save file" dialog and write `content` to the chosen
/// destination. `filename` seeds the dialog's default name. Returns `true` when
/// the file was written, `false` when the user cancelled.
#[tauri::command]
pub async fn export_markdown(content: String, filename: String) -> Result<bool, String> {
    let path = tokio::task::spawn_blocking(move || {
        rfd::FileDialog::new()
            .set_file_name(&filename)
            .add_filter("Markdown", &["md"])
            .save_file()
    })
    .await
    .map_err(|e| e.to_string())?;

    match path {
        Some(p) => {
            std::fs::write(&p, content).map_err(|e| e.to_string())?;
            Ok(true)
        }
        None => Ok(false),
    }
}
