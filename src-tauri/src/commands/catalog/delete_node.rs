use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn delete_node(state: State<'_, AppState>, id: String) -> Result<(), String> {
    crate::logging::logged("delete_node", crate::service::delete_node(&state, id).await)
}
