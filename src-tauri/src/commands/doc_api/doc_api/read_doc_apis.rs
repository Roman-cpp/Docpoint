use crate::domain::doc_api::doc_api::entity::DocApi;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn read_docs(state: State<'_, AppState>) -> Result<Vec<DocApi>, String> {
    crate::logging::logged("read_docs", crate::service::read_docs(&state).await)
}
