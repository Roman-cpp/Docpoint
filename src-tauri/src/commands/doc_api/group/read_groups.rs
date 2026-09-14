use crate::domain::doc_api::group::entity::Group;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn read_groups(state: State<'_, AppState>, doc_id: String) -> Result<Vec<Group>, String> {
    crate::logging::logged(
        "read_groups",
        crate::service::read_groups(&state, doc_id).await,
    )
}
