use crate::domain::catalog::dto::CreateNodeDTO;
use crate::domain::doc_api::group::dto::CreateGroupDTO;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn import_doc(
    state: State<'_, AppState>,
    node: CreateNodeDTO,
    groups: Vec<CreateGroupDTO>,
) -> Result<String, String> {
    crate::logging::logged(
        "import_doc",
        crate::service::import_doc(&state, node, groups).await,
    )
}
