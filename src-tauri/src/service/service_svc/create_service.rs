use crate::domain::service::dto::CreateServiceDTO;
use crate::domain::service::entity::Service;
use crate::domain::service::repository::ServiceRepository;
use crate::repository::sqlite::service::ServiceRepo;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn create_service(
    state: State<'_, AppState>,
    service: CreateServiceDTO,
) -> Result<Service, String> {
    ServiceRepo::new(&state.db).create(&service).await
}
