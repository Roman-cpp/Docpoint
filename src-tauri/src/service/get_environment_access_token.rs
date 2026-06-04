use crate::domain::environment_auth::repository;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn get_environment_access_token(
    state: State<'_, AppState>,
    environment_id: String,
) -> Result<Option<String>, String> {
    repository::get_access_token(&state.db, &environment_id).await
}
