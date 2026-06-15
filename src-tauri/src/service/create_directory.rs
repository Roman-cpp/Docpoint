use crate::domain::markdown::repository::MarkdownRepo;
use crate::state::AppState;
use tauri::State;

/// Create a new sub-folder inside `parent` (a vault-relative path, empty string
/// for the root). Returns the new folder's vault-relative id.
#[tauri::command]
pub async fn create_directory(
    state: State<'_, AppState>,
    parent: String,
    name: String,
) -> Result<String, String> {
    MarkdownRepo::new(&state.vault_dir)
        .create_dir(&parent, &name)
        .await
}
