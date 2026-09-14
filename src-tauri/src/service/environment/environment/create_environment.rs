use crate::domain::environment::environment::dto::CreateEnvironmentDTO;
use crate::domain::environment::environment::entity::Environment;
use crate::domain::environment::environment::repository::EnvironmentRepository;
use crate::repository::sqlite::environment::EnvironmentRepo;
use crate::state::AppState;

pub async fn create_environment(
    state: &AppState,
    platform_id: String,
    environment: CreateEnvironmentDTO,
) -> Result<Environment, String> {
    EnvironmentRepo::new(&state.db)
        .create(&platform_id, &environment)
        .await
}
