use crate::domain::doc_api::doc_api::entity::DocApi;
use crate::domain::domain::repository::DomainRepository;
use crate::repository::sqlite::domain::DomainRepo;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn read_domain_docs(
    state: State<'_, AppState>,
    domain_id: String,
) -> Result<Vec<DocApi>, String> {
    DomainRepo::new(&state.db).docs_by_domain(&domain_id).await
}
