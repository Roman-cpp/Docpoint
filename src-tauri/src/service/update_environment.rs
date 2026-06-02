use crate::domain::environment::model::UpdateEnvironmentDTO;
use crate::domain::environment::repository::{EnvironmentRepo, EnvironmentRepository};
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn update_environment(
    state: State<'_, AppState>,
    environment: UpdateEnvironmentDTO,
) -> Result<(), String> {
    EnvironmentRepo::new(&state.db).update(&environment).await
}
