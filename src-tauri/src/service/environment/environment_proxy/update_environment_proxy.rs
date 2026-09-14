use crate::domain::environment::environment_proxy::dto::UpdateEnvironmentProxyDTO;
use crate::domain::environment::environment_proxy::repository;
use crate::state::AppState;

pub async fn update_environment_proxy(
    state: &AppState,
    proxy: UpdateEnvironmentProxyDTO,
) -> Result<(), String> {
    repository::upsert(&state.db, &proxy).await
}
