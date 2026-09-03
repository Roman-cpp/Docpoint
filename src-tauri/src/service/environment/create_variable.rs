use crate::domain::environment::environment::dto::CreateVariableDTO;
use crate::domain::environment::environment::entity::EnvValue;
use crate::domain::environment::environment::repository::EnvironmentRepository;
use crate::repository::sqlite::environment::EnvironmentRepo;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn create_variable(
    state: State<'_, AppState>,
    environment_id: String,
    variable: CreateVariableDTO,
) -> Result<EnvValue, String> {
    crate::logging::logged(
        "create_variable",
        async {
            EnvironmentRepo::new(&state.db)
                .create_variable(&environment_id, &variable)
                .await
        }
        .await,
    )
}
