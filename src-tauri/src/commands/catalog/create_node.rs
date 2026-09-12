use crate::domain::catalog::dto::CreateNodeDTO;
use crate::domain::catalog::entity::CatalogNode;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn create_node(
    state: State<'_, AppState>,
    node: CreateNodeDTO,
) -> Result<CatalogNode, String> {
    crate::logging::logged(
        "create_node",
        crate::service::create_node(&state, node).await,
    )
}
