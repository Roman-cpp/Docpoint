use crate::domain::environment::repository;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn delete_variable(
    state: State<'_, AppState>,
    id: String,
) -> Result<(), String> {
    repository::delete_variable(&state.db, &id).await
}
