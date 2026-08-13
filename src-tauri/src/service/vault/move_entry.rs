use crate::domain::vault::repository::VaultRepository;
use crate::domain::vault::scope::FileScope;
use crate::service::vault::scope::scope_repo;
use crate::state::AppState;
use tauri::State;

/// Move a file or folder to another scope-relative path. Renaming is the same
/// call with an unchanged parent folder. Returns the entry's new path.
#[tauri::command]
pub async fn move_entry(
    state: State<'_, AppState>,
    scope: FileScope,
    from: String,
    to: String,
) -> Result<String, String> {
    scope_repo(&state, &scope)
        .await?
        .move_entry(&from, &to)
        .await
}
