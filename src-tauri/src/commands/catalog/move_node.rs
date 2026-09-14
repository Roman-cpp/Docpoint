use crate::domain::catalog::dto::MoveNodeDTO;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn move_node(state: State<'_, AppState>, node: MoveNodeDTO) -> Result<(), String> {
    crate::logging::logged("move_node", crate::service::move_node(&state, node).await)
}
