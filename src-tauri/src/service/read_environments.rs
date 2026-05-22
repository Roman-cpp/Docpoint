use crate::domain::environment::model::Environment;
use crate::domain::environment::repository;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn read_environments(
    state: State<'_, AppState>,
    doc_id: String,
) -> Result<Vec<Environment>, String> {
    repository::read_configs(&state.db, &doc_id).await
}
