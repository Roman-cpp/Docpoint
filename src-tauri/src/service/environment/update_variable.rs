use crate::domain::environment::environment::dto::UpdateVariableDTO;
use crate::domain::environment::environment::repository::EnvironmentRepository;
use crate::repository::sqlite::environment::EnvironmentRepo;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn update_variable(
    state: State<'_, AppState>,
    variable: UpdateVariableDTO,
) -> Result<(), String> {
    EnvironmentRepo::new(&state.db).update_variable(&variable).await
}
