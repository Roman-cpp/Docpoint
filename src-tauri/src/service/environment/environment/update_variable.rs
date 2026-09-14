use crate::domain::environment::environment::dto::UpdateVariableDTO;
use crate::domain::environment::environment::repository::EnvironmentRepository;
use crate::repository::sqlite::environment::EnvironmentRepo;
use crate::state::AppState;

pub async fn update_variable(state: &AppState, variable: UpdateVariableDTO) -> Result<(), String> {
    EnvironmentRepo::new(&state.db)
        .update_variable(&variable)
        .await
}
