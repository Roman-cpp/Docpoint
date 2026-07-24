use crate::domain::vault::repository::VaultRepository;
use crate::domain::vault::scope::FileScope;
use crate::service::vault::scope::scope_repo;
use crate::state::AppState;
use tauri::State;

/// Create a folder named `name` inside `path`. Returns its scope-relative path.
#[tauri::command]
pub async fn create_directory(
    state: State<'_, AppState>,
    scope: FileScope,
    path: String,
    name: String,
) -> Result<String, String> {
    scope_repo(&state, &scope)
        .await?
        .create_dir(&path, &name)
        .await
}
