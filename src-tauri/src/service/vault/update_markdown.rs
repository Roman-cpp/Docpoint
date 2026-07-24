use crate::domain::vault::repository::VaultRepository;
use crate::domain::vault::scope::FileScope;
use crate::service::vault::scope::scope_repo;
use crate::state::AppState;
use tauri::State;

/// Overwrite the body of an existing file.
#[tauri::command]
pub async fn update_markdown(
    state: State<'_, AppState>,
    scope: FileScope,
    path: String,
    content: String,
) -> Result<(), String> {
    scope_repo(&state, &scope)
        .await?
        .write_file(&path, &content)
        .await
}
