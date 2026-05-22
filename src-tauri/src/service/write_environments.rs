use crate::domain::environment::model::CreateEnvironmentDTO;
use crate::domain::environment::repository;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn write_environments(
    state: State<'_, AppState>,
    doc_id: String,
    environments: Vec<CreateEnvironmentDTO>,
) -> Result<(), String> {
    repository::write_configs(&state.db, &doc_id, &environments).await
}
