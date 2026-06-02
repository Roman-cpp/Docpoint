use crate::domain::environment::model::CreateEnvironmentDTO;
use crate::domain::environment::repository::{EnvironmentRepo, EnvironmentRepository};
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn write_environments(
    state: State<'_, AppState>,
    doc_id: String,
    environments: Vec<CreateEnvironmentDTO>,
) -> Result<(), String> {
    EnvironmentRepo::new(&state.db)
        .write_configs(&doc_id, "doc", &environments)
        .await
}
