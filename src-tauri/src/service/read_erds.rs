use crate::domain::doc_erd::model::DocErd;
use crate::domain::doc_erd::repository::{DocErdRepo, DocErdRepository};
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn read_erds(state: State<'_, AppState>) -> Result<Vec<DocErd>, String> {
    DocErdRepo::new(&state.db).all().await
}
