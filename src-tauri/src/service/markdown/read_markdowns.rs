use crate::domain::markdown::entity::MarkdownFile;
use crate::domain::markdown::repository::MarkdownRepo;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn read_markdowns(state: State<'_, AppState>) -> Result<Vec<MarkdownFile>, String> {
    MarkdownRepo::new(&state.vault_dir).all().await
}
