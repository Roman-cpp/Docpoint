use crate::domain::doc_api::doc_api::dto::CreateDocDTO;
use crate::domain::doc_api::doc_api::repository::DocRepository;
use crate::repository::sqlite::doc_api::DocRepo;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn create_doc(
    state: State<'_, AppState>,
    doc: CreateDocDTO,
) -> Result<String, String> {
    DocRepo::new(&state.db).create(&doc).await
}
