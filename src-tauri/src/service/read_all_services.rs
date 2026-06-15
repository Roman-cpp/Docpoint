use crate::domain::service::model::Service;
use crate::domain::service::repository::{ServiceRepo, ServiceRepository};
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn read_all_services(state: State<'_, AppState>) -> Result<Vec<Service>, String> {
    ServiceRepo::new(&state.db).all().await
}
