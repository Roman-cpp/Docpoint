use crate::domain::markdown::repository::MarkdownRepo;
use crate::state::AppState;
use std::path::Path;
use tauri::State;

/// Copy an external file (dragged in from the OS) into the vault under `folder`
/// (a vault-relative path, empty string for the root), keeping its original
/// name. Returns the new file's vault-relative id.
#[tauri::command]
pub async fn import_file(
    state: State<'_, AppState>,
    src_path: String,
    folder: String,
) -> Result<String, String> {
    MarkdownRepo::new(&state.vault_dir)
        .import(Path::new(&src_path), &folder)
        .await
}
