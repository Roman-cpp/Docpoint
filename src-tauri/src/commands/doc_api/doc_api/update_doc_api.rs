use crate::domain::doc_api::doc_api::dto::UpdateDocApiDTO;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn update_doc(
    state: State<'_, AppState>,
    doc: UpdateDocApiDTO,
) -> Result<String, String> {
    crate::logging::logged("update_doc", crate::service::update_doc(&state, doc).await)
}
