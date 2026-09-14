use crate::domain::environment::environment_auth::dto::UpdateEnvironmentAuthDTO;
use crate::domain::environment::environment_auth::repository;
use crate::state::AppState;

pub async fn update_environment_auth(
    state: &AppState,
    auth: UpdateEnvironmentAuthDTO,
) -> Result<(), String> {
    repository::upsert(&state.db, &auth).await
}
