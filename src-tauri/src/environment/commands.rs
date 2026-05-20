use crate::state::AppState;
use super::model::{CreateEnvironment, Environment};
use super::repository;
use tauri::State;

#[tauri::command]
pub async fn read_environments(
    state: State<'_, AppState>,
    doc_id: String,
) -> Result<Vec<Environment>, String> {
    repository::read_configs(&state.db, &doc_id).await
}

#[tauri::command]
pub async fn write_environments(
    state: State<'_, AppState>,
    doc_id: String,
    environments: Vec<CreateEnvironment>,
) -> Result<(), String> {
    repository::write_configs(&state.db, &doc_id, &environments).await
}
