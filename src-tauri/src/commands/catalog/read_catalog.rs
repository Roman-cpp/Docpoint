use crate::domain::catalog::entity::CatalogNode;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn read_catalog_tree(
    state: State<'_, AppState>,
    platform_id: String,
) -> Result<Vec<CatalogNode>, String> {
    crate::logging::logged(
        "read_catalog_tree",
        crate::service::read_catalog_tree(&state, platform_id).await,
    )
}

#[tauri::command]
pub async fn read_node(
    state: State<'_, AppState>,
    id: String,
) -> Result<Option<CatalogNode>, String> {
    crate::logging::logged("read_node", crate::service::read_node(&state, id).await)
}
