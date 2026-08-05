use crate::domain::doc_erd::doc_erd::entity::DocErd;
use crate::domain::doc_erd::doc_erd::repository::DocErdRepository;
use crate::repository::sqlite::doc_erd::DocErdRepo;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn read_domain_erds(
    state: State<'_, AppState>,
    domain_id: String,
) -> Result<Vec<DocErd>, String> {
    DocErdRepo::new(&state.db).by_domain(&domain_id).await
}
