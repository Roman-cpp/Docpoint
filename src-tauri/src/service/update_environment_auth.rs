use crate::domain::environment_auth::model::UpdateEnvironmentAuthDTO;
use crate::domain::environment_auth::repository;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn update_environment_auth(
    state: State<'_, AppState>,
    auth: UpdateEnvironmentAuthDTO,
) -> Result<(), String> {
    repository::upsert(&state.db, &auth).await
}
