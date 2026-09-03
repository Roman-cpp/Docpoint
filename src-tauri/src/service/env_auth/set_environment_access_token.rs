use crate::domain::environment::environment_auth::repository;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn set_environment_access_token(
    state: State<'_, AppState>,
    environment_id: String,
    token: Option<String>,
) -> Result<(), String> {
    crate::logging::logged(
        "set_environment_access_token",
        async { repository::set_access_token(&state.db, &environment_id, token.as_deref()).await }
            .await,
    )
}
