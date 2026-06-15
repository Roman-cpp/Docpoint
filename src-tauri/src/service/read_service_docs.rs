use crate::domain::doc::model::Doca;
use crate::domain::service::repository::{ServiceRepo, ServiceRepository};
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn read_service_docs(
    state: State<'_, AppState>,
    service_id: String,
) -> Result<Vec<Doca>, String> {
    ServiceRepo::new(&state.db).docs_by_service(&service_id).await
}
