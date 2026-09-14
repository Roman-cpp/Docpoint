use crate::domain::environment::environment::dto::UpdateEnvironmentDTO;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn update_environment(
    state: State<'_, AppState>,
    environment: UpdateEnvironmentDTO,
) -> Result<(), String> {
    crate::logging::logged(
        "update_environment",
        crate::service::update_environment(&state, environment).await,
    )
}
