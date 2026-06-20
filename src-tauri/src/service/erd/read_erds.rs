use crate::domain::doc_erd::doc_erd::entity::DocErd;
use crate::domain::doc_erd::doc_erd::repository::DocErdRepository;
use crate::repository::sqlite::doc_erd::DocErdRepo;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn read_erds(state: State<'_, AppState>) -> Result<Vec<DocErd>, String> {
    DocErdRepo::new(&state.db).all().await
}
