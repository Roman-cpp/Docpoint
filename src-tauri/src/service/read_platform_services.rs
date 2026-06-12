use crate::domain::service::model::Service;
use crate::domain::service::repository::{ServiceRepo, ServiceRepository};
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn read_platform_services(
    state: State<'_, AppState>,
    platform_id: String,
) -> Result<Vec<Service>, String> {
    ServiceRepo::new(&state.db).by_platform(&platform_id).await
}
