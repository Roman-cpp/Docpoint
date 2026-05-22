use crate::domain::environment::model::UpdateEnvironment;
use crate::domain::environment::repository;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn update_environment(
    state: State<'_, AppState>,
    environment: UpdateEnvironment,
) -> Result<(), String> {
    repository::update_environment(&state.db, &environment).await
}
