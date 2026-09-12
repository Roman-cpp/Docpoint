use crate::domain::catalog::dto::RenameNodeDTO;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn rename_node(state: State<'_, AppState>, node: RenameNodeDTO) -> Result<(), String> {
    crate::logging::logged(
        "rename_node",
        crate::service::rename_node(&state, node).await,
    )
}
