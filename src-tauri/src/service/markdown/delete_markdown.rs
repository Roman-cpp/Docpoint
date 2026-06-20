use crate::domain::markdown::repository::MarkdownRepo;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn delete_markdown(state: State<'_, AppState>, id: String) -> Result<(), String> {
    MarkdownRepo::new(&state.vault_dir).delete(&id).await
}
