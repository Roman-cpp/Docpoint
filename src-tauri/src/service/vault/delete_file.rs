use crate::domain::vault::repository::VaultRepository;
use crate::domain::vault::scope::FileScope;
use crate::service::vault::scope::scope_repo;
use crate::state::AppState;
use tauri::State;

/// Delete a single file by its scope-relative path.
#[tauri::command]
pub async fn delete_file(
    state: State<'_, AppState>,
    scope: FileScope,
    path: String,
) -> Result<(), String> {
    scope_repo(&state, &scope).await?.delete_file(&path).await
}
