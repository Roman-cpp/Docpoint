use crate::domain::environment::model::Environment;
use crate::domain::environment::repository::{EnvironmentRepo, EnvironmentRepository};
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn duplicate_environment(
    state: State<'_, AppState>,
    environment_id: String,
) -> Result<Environment, String> {
    EnvironmentRepo::new(&state.db)
        .duplicate(&environment_id)
        .await
}
