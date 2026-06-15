use crate::domain::markdown::model::DirListing;
use crate::domain::markdown::repository::MarkdownRepo;
use crate::state::AppState;
use tauri::State;

/// List the sub-folders and files directly inside `folder` (a vault-relative
/// path). Pass an empty string to list the vault root.
#[tauri::command]
pub async fn read_directory(
    state: State<'_, AppState>,
    folder: String,
) -> Result<DirListing, String> {
    MarkdownRepo::new(&state.vault_dir).list(&folder).await
}
