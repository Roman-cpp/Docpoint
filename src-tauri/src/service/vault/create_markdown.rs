use crate::domain::vault::repository::VaultRepository;
use crate::domain::vault::scope::FileScope;
use crate::service::vault::scope::scope_repo;
use crate::state::AppState;
use tauri::State;

/// Create `<path>/<name>` with an initial body. Returns its scope-relative path.
#[tauri::command]
pub async fn create_markdown(
    state: State<'_, AppState>,
    scope: FileScope,
    path: String,
    name: String,
    content: String,
) -> Result<String, String> {
    scope_repo(&state, &scope)
        .await?
        .create_file(&path, &name, &content)
        .await
}
