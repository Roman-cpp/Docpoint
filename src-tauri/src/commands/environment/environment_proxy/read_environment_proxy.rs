use crate::domain::environment::environment_proxy::dto::EnvironmentProxyDTO;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn read_environment_proxy(
    state: State<'_, AppState>,
    environment_id: String,
) -> Result<EnvironmentProxyDTO, String> {
    crate::logging::logged(
        "read_environment_proxy",
        crate::service::read_environment_proxy(&state, environment_id).await,
    )
}
