use crate::domain::environment::environment_auth::dto::EnvironmentAuthDTO;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn authenticate_environment(
    state: State<'_, AppState>,
    environment_id: String,
) -> Result<Option<EnvironmentAuthDTO>, String> {
    crate::logging::logged(
        "authenticate_environment",
        crate::service::authenticate_environment(&state, environment_id).await,
    )
}
