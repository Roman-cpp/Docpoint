use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn delete_group(state: State<'_, AppState>, group_id: String) -> Result<(), String> {
    crate::logging::logged(
        "delete_group",
        crate::service::delete_group(&state, group_id).await,
    )
}
