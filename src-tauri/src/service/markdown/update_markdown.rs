use crate::domain::markdown::dto::UpdateMarkdownDTO;
use crate::domain::markdown::repository::MarkdownRepo;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn update_markdown(
    state: State<'_, AppState>,
    file: UpdateMarkdownDTO,
) -> Result<String, String> {
    MarkdownRepo::new(&state.vault_dir).update(&file).await
}
