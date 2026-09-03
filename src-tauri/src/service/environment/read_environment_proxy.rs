use crate::domain::environment::environment_proxy::dto::EnvironmentProxyDTO;
use crate::domain::environment::environment_proxy::repository;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn read_environment_proxy(
    state: State<'_, AppState>,
    environment_id: String,
) -> Result<EnvironmentProxyDTO, String> {
    crate::logging::logged(
        "read_environment_proxy",
        async { repository::ensure_row(&state.db, &environment_id).await }.await,
    )
}
