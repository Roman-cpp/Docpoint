use crate::domain::doc_erd::model::CreateDocErdDTO;
use crate::domain::doc_erd::repository::{DocErdRepo, DocErdRepository};
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn create_erd(
    state: State<'_, AppState>,
    erd: CreateDocErdDTO,
) -> Result<String, String> {
    DocErdRepo::new(&state.db).create(&erd).await
}
