use crate::domain::environment::model::UpdateVariable;
use crate::domain::environment::repository;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn update_variable(
    state: State<'_, AppState>,
    variable: UpdateVariable,
) -> Result<(), String> {
    repository::update_variable(&state.db, &variable).await
}
