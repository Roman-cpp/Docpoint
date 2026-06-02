use crate::domain::environment::model::{CreateEnvironmentDTO, Environment};
use crate::domain::environment::repository::{EnvironmentRepo, EnvironmentRepository};
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn create_environment(
    state: State<'_, AppState>,
    environmentable_id: String,
    environmentable_type: String,
    environment: CreateEnvironmentDTO,
) -> Result<Environment, String> {
    EnvironmentRepo::new(&state.db)
        .create(&environmentable_id, &environmentable_type, &environment)
        .await
}
