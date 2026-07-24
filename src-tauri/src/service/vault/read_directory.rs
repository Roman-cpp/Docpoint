use crate::domain::vault::entity::DirListing;
use crate::domain::vault::repository::VaultRepository;
use crate::domain::vault::scope::FileScope;
use crate::service::vault::scope::scope_repo;
use crate::state::AppState;
use tauri::State;

/// List the folders and files directly inside `path` (relative to `scope`,
/// empty string for the scope root).
#[tauri::command]
pub async fn read_directory(
    state: State<'_, AppState>,
    scope: FileScope,
    path: String,
) -> Result<DirListing, String> {
    scope_repo(&state, &scope).await?.list(&path).await
}
