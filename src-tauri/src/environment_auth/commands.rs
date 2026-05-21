use crate::state::AppState;
use super::model::{EnvironmentAuth, UpdateEnvironmentAuth};
use super::repository;
use tauri::State;

#[tauri::command]
pub async fn read_environment_auth(
    state: State<'_, AppState>,
    environment_id: String,
) -> Result<EnvironmentAuth, String> {
    repository::ensure_row(&state.db, &environment_id).await
}

#[tauri::command]
pub async fn update_environment_auth(
    state: State<'_, AppState>,
    auth: UpdateEnvironmentAuth,
) -> Result<(), String> {
    repository::upsert(&state.db, &auth).await
}

#[tauri::command]
pub async fn set_environment_access_token(
    state: State<'_, AppState>,
    environment_id: String,
    token: Option<String>,
) -> Result<(), String> {
    repository::set_access_token(&state.db, &environment_id, token.as_deref()).await
}
