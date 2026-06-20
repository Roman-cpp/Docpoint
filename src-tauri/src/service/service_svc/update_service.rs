use crate::domain::service::dto::UpdateServiceDTO;
use crate::domain::service::repository::ServiceRepository;
use crate::repository::sqlite::service::ServiceRepo;
use crate::state::AppState;
use tauri::State;

/// Update an existing microservice.
#[tauri::command]
pub async fn update_service(
    state: State<'_, AppState>,
    service: UpdateServiceDTO,
) -> Result<(), String> {
    ServiceRepo::new(&state.db).update(&service).await
}
