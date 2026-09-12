use crate::domain::environment::environment_auth::dto::EnvironmentAuthDTO;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn read_environment_auth(
    state: State<'_, AppState>,
    environment_id: String,
) -> Result<EnvironmentAuthDTO, String> {
    crate::logging::logged(
        "read_environment_auth",
        crate::service::read_environment_auth(&state, environment_id).await,
    )
}
