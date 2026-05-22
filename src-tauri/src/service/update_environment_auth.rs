use crate::domain::environment_auth::model::UpdateEnvironmentAuth;
use crate::domain::environment_auth::repository;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn update_environment_auth(
    state: State<'_, AppState>,
    auth: UpdateEnvironmentAuth,
) -> Result<(), String> {
    repository::upsert(&state.db, &auth).await
}
