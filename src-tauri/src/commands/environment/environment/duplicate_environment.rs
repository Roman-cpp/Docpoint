use crate::domain::environment::environment::entity::Environment;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn duplicate_environment(
    state: State<'_, AppState>,
    environment_id: String,
) -> Result<Environment, String> {
    crate::logging::logged(
        "duplicate_environment",
        crate::service::duplicate_environment(&state, environment_id).await,
    )
}
