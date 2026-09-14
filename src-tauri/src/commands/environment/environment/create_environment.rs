use crate::domain::environment::environment::dto::CreateEnvironmentDTO;
use crate::domain::environment::environment::entity::Environment;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn create_environment(
    state: State<'_, AppState>,
    platform_id: String,
    environment: CreateEnvironmentDTO,
) -> Result<Environment, String> {
    crate::logging::logged(
        "create_environment",
        crate::service::create_environment(&state, platform_id, environment).await,
    )
}
