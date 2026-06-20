use crate::domain::doc_api::doc_api::dto::UpdateDocDTO;
use crate::domain::doc_api::doc_api::repository::DocRepository;
use crate::repository::sqlite::doc_api::DocRepo;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn update_doc(
    state: State<'_, AppState>,
    doc: UpdateDocDTO,
) -> Result<String, String> {
    DocRepo::new(&state.db).update(&doc).await
}
