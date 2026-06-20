use crate::domain::markdown::entity::MarkdownFile;
use crate::domain::markdown::repository::MarkdownRepo;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn read_markdown(
    state: State<'_, AppState>,
    id: String,
) -> Result<Option<MarkdownFile>, String> {
    MarkdownRepo::new(&state.vault_dir).find(&id).await
}
