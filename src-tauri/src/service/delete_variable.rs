use crate::domain::environment::repository::{EnvironmentRepo, EnvironmentRepository};
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn delete_variable(
    state: State<'_, AppState>,
    id: String,
) -> Result<(), String> {
    EnvironmentRepo::new(&state.db).delete_variable(&id).await
}
