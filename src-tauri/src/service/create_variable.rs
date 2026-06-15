use crate::domain::environment::model::{CreateVariableDTO, EnvValue};
use crate::domain::environment::repository::{EnvironmentRepo, EnvironmentRepository};
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn create_variable(
    state: State<'_, AppState>,
    environment_id: String,
    variable: CreateVariableDTO,
) -> Result<EnvValue, String> {
    EnvironmentRepo::new(&state.db)
        .create_variable(&environment_id, &variable)
        .await
}
