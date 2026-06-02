use crate::domain::environment::model::UpdateVariableDTO;
use crate::domain::environment::repository::{EnvironmentRepo, EnvironmentRepository};
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn update_variable(
    state: State<'_, AppState>,
    variable: UpdateVariableDTO,
) -> Result<(), String> {
    EnvironmentRepo::new(&state.db).update_variable(&variable).await
}
