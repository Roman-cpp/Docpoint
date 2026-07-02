use crate::domain::doc_api::doc_api::repository::DocRepository;
use crate::repository::sqlite::doc_api::DocRepo;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn delete_doc(
    state: State<'_, AppState>,
    id: String,
) -> Result<(), String> {
    DocRepo::new(&state.db).delete(&id).await
}
