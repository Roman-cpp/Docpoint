use crate::domain::environment::model::{CreateEnvironmentDTO, Environment};
use crate::domain::environment::repository::{EnvironmentRepo, EnvironmentRepository};
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn create_environment(
    state: State<'_, AppState>,
    platform_id: String,
    environment: CreateEnvironmentDTO,
) -> Result<Environment, String> {
    EnvironmentRepo::new(&state.db)
        .create(&platform_id, &environment)
        .await
}
