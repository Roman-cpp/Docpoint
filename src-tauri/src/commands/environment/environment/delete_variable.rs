use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn delete_variable(state: State<'_, AppState>, id: String) -> Result<(), String> {
    crate::logging::logged(
        "delete_variable",
        crate::service::delete_variable(&state, id).await,
    )
}
