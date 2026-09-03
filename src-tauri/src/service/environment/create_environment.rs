use crate::domain::environment::environment::dto::CreateEnvironmentDTO;
use crate::domain::environment::environment::entity::Environment;
use crate::domain::environment::environment::repository::EnvironmentRepository;
use crate::repository::sqlite::environment::EnvironmentRepo;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn create_environment(
    state: State<'_, AppState>,
    platform_id: String,
    environment: CreateEnvironmentDTO,
) -> Result<Environment, String> {
    crate::logging::logged(
        "create_environment",
        async {
            EnvironmentRepo::new(&state.db)
                .create(&platform_id, &environment)
                .await
        }
        .await,
    )
}
