use crate::domain::environment::environment::dto::UpdateVariableDTO;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn update_variable(
    state: State<'_, AppState>,
    variable: UpdateVariableDTO,
) -> Result<(), String> {
    crate::logging::logged(
        "update_variable",
        crate::service::update_variable(&state, variable).await,
    )
}
