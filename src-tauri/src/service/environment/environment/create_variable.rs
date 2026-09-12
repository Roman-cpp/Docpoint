use crate::domain::environment::environment::dto::CreateVariableDTO;
use crate::domain::environment::environment::entity::EnvValue;
use crate::domain::environment::environment::repository::EnvironmentRepository;
use crate::repository::sqlite::environment::EnvironmentRepo;
use crate::state::AppState;

pub async fn create_variable(
    state: &AppState,
    environment_id: String,
    variable: CreateVariableDTO,
) -> Result<EnvValue, String> {
    EnvironmentRepo::new(&state.db)
        .create_variable(&environment_id, &variable)
        .await
}
