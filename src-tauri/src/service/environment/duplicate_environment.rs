use crate::domain::environment::environment::entity::Environment;
use crate::domain::environment::environment::repository::EnvironmentRepository;
use crate::repository::sqlite::environment::EnvironmentRepo;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn duplicate_environment(
    state: State<'_, AppState>,
    environment_id: String,
) -> Result<Environment, String> {
    crate::logging::logged("duplicate_environment", async {
        EnvironmentRepo::new(&state.db)
            .duplicate(&environment_id)
            .await
    }
    .await)
}
