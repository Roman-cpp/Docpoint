use crate::domain::doc_api::doc_api::entity::DocApi;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn read_doc(state: State<'_, AppState>, id: String) -> Result<Option<DocApi>, String> {
    crate::logging::logged("read_doc", crate::service::read_doc(&state, id).await)
}
