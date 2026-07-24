use crate::domain::vault::entity::MarkdownFile;
use crate::domain::vault::repository::VaultRepository;
use crate::domain::vault::scope::FileScope;
use crate::service::vault::scope::scope_repo;
use crate::state::AppState;
use tauri::State;

/// Read a markdown file with its body, or `None` when it does not exist.
#[tauri::command]
pub async fn read_markdown(
    state: State<'_, AppState>,
    scope: FileScope,
    path: String,
) -> Result<Option<MarkdownFile>, String> {
    scope_repo(&state, &scope).await?.read_markdown(&path).await
}
