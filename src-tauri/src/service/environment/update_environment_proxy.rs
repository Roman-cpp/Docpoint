use crate::domain::environment::environment_proxy::dto::UpdateEnvironmentProxyDTO;
use crate::domain::environment::environment_proxy::repository;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn update_environment_proxy(
    state: State<'_, AppState>,
    proxy: UpdateEnvironmentProxyDTO,
) -> Result<(), String> {
    repository::upsert(&state.db, &proxy).await
}
