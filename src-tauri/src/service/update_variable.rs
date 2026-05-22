use crate::domain::environment::model::UpdateVariableDTO;
use crate::domain::environment::repository;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn update_variable(
    state: State<'_, AppState>,
    variable: UpdateVariableDTO,
) -> Result<(), String> {
    repository::update_variable(&state.db, &variable).await
}
