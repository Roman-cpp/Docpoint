use crate::domain::doc_api::doc_api::entity::DocApi;
use crate::domain::doc_api::doc_api::repository::DocRepository;
use crate::repository::sqlite::doc_api::DocRepo;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn read_doc(
    state: State<'_, AppState>,
    id: String,
) -> Result<Option<DocApi>, String> {
    DocRepo::new(&state.db).find(&id).await
}
