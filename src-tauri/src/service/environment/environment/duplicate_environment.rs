use crate::domain::environment::environment::entity::Environment;
use crate::domain::environment::environment::repository::EnvironmentRepository;
use crate::repository::sqlite::environment::EnvironmentRepo;
use crate::state::AppState;

pub async fn duplicate_environment(
    state: &AppState,
    environment_id: String,
) -> Result<Environment, String> {
    EnvironmentRepo::new(&state.db)
        .duplicate(&environment_id)
        .await
}
