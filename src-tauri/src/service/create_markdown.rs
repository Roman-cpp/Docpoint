use crate::domain::markdown::model::CreateMarkdownDTO;
use crate::domain::markdown::repository::MarkdownRepo;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn create_markdown(
    state: State<'_, AppState>,
    file: CreateMarkdownDTO,
) -> Result<String, String> {
    MarkdownRepo::new(&state.vault_dir).create(&file).await
}
