use crate::domain::environment::environment::dto::UpdateEnvironmentDTO;
use crate::domain::environment::environment::repository::EnvironmentRepository;
use crate::repository::sqlite::environment::EnvironmentRepo;
use crate::state::AppState;

pub async fn update_environment(
    state: &AppState,
    environment: UpdateEnvironmentDTO,
) -> Result<(), String> {
    EnvironmentRepo::new(&state.db).update(&environment).await
}
