use crate::domain::doc_api::doc_api::entity::DocApi;
use crate::domain::service::repository::ServiceRepository;
use crate::repository::sqlite::service::ServiceRepo;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn read_service_docs(
    state: State<'_, AppState>,
    service_id: String,
) -> Result<Vec<DocApi>, String> {
    ServiceRepo::new(&state.db).docs_by_service(&service_id).await
}
