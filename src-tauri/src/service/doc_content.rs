use crate::state::AppState;
use std::path::PathBuf;
use tauri::State;

/// Resolve the on-disk markdown path for a doc id, guarding against any path
/// traversal: only the final, non-empty path component is kept.
fn doc_path(state: &AppState, id: &str) -> Result<PathBuf, String> {
    let name = std::path::Path::new(id)
        .file_name()
        .and_then(|s| s.to_str())
        .filter(|s| !s.is_empty())
        .ok_or_else(|| "invalid doc id".to_string())?;

    Ok(state.vault_dir.join(format!("{name}.md")))
}

/// Read the markdown body of a doc. Returns an empty string when the doc has no
/// body yet, so the editor can open a fresh document without erroring.
#[tauri::command]
pub async fn read_doc_content(state: State<'_, AppState>, id: String) -> Result<String, String> {
    let path = doc_path(&state, &id)?;

    match tokio::fs::read_to_string(&path).await {
        Ok(content) => Ok(content),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(String::new()),
        Err(e) => Err(e.to_string()),
    }
}

/// Persist the markdown body of a doc to `<vault>/<id>.md`, creating the vault
/// directory if it does not exist yet.
#[tauri::command]
pub async fn write_doc_content(
    state: State<'_, AppState>,
    id: String,
    content: String,
) -> Result<(), String> {
    let path = doc_path(&state, &id)?;

    if let Some(parent) = path.parent() {
        tokio::fs::create_dir_all(parent)
            .await
            .map_err(|e| e.to_string())?;
    }

    tokio::fs::write(&path, content)
        .await
        .map_err(|e| e.to_string())
}
