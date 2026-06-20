use crate::domain::environment::environment_auth::dto::EnvironmentAuthDTO;
use crate::domain::environment::environment_auth::repository;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn read_environment_auth(
    state: State<'_, AppState>,
    environment_id: String,
) -> Result<EnvironmentAuthDTO, String> {
    repository::ensure_row(&state.db, &environment_id).await
}
