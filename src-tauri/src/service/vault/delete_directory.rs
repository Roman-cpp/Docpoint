use crate::domain::vault::repository::VaultRepository;
use crate::domain::vault::scope::FileScope;
use crate::service::vault::scope::scope_repo;
use crate::state::AppState;
use tauri::State;

/// Delete a folder and everything inside it.
#[tauri::command]
pub async fn delete_directory(
    state: State<'_, AppState>,
    scope: FileScope,
    path: String,
) -> Result<(), String> {
    scope_repo(&state, &scope).await?.delete_dir(&path).await
}
