use crate::domain::doc::model::CreateDocDTO;
use crate::domain::doc::repository::{DocRepo, DocRepository};
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn create_doc(
    state: State<'_, AppState>,
    doc: CreateDocDTO,
) -> Result<String, String> {
    DocRepo::new(&state.db).create(&doc).await
}
