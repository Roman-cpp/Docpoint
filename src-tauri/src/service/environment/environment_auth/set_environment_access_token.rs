use crate::domain::environment::environment_auth::repository;
use crate::state::AppState;

pub async fn set_environment_access_token(
    state: &AppState,
    environment_id: String,
    token: Option<String>,
) -> Result<(), String> {
    repository::set_access_token(&state.db, &environment_id, token.as_deref()).await
}
