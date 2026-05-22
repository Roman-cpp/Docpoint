use crate::domain::environment::model::{CreateEnvironmentDTO, Environment};
use crate::domain::environment::repository;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn create_environment(
    state: State<'_, AppState>,
    doc_id: String,
    environment: CreateEnvironmentDTO,
) -> Result<Environment, String> {
    repository::create_environment(&state.db, &doc_id, &environment).await
}
