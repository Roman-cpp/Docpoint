use crate::domain::environment::environment_proxy::dto::UpdateEnvironmentProxyDTO;
use crate::domain::environment::environment_proxy::repository;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn update_environment_proxy(
    state: State<'_, AppState>,
    proxy: UpdateEnvironmentProxyDTO,
) -> Result<(), String> {
    crate::logging::logged(
        "update_environment_proxy",
        async { repository::upsert(&state.db, &proxy).await }.await,
    )
}
