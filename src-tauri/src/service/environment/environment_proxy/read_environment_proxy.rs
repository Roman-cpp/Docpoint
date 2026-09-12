use crate::domain::environment::environment_proxy::dto::EnvironmentProxyDTO;
use crate::domain::environment::environment_proxy::repository;
use crate::state::AppState;

pub async fn read_environment_proxy(
    state: &AppState,
    environment_id: String,
) -> Result<EnvironmentProxyDTO, String> {
    repository::ensure_row(&state.db, &environment_id).await
}
