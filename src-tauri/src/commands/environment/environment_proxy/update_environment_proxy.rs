use crate::domain::environment::environment_proxy::dto::UpdateEnvironmentProxyDTO;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn update_environment_proxy(
    state: State<'_, AppState>,
    proxy: UpdateEnvironmentProxyDTO,
) -> Result<(), String> {
    crate::logging::logged(
        "update_environment_proxy",
        crate::service::update_environment_proxy(&state, proxy).await,
    )
}
