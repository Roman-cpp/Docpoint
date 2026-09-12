use crate::domain::environment::environment::repository::EnvironmentRepository;
use crate::repository::sqlite::environment::EnvironmentRepo;
use crate::state::AppState;

pub async fn delete_environment(state: &AppState, id: String) -> Result<(), String> {
    EnvironmentRepo::new(&state.db).delete(&id).await
}
