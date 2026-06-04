use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn set_selected_environment(
    state: State<'_, AppState>,
    environment_id: Option<String>,
) -> Result<(), String> {
    *state
        .selected_environment_id
        .lock()
        .map_err(|e| e.to_string())? = environment_id;
    Ok(())
}
