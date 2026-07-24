use crate::domain::service::dto::CreateServiceDTO;
use crate::domain::service::entity::Service;
use crate::domain::service::repository::ServiceRepository;
use crate::repository::sqlite::service::ServiceRepo;
use crate::service::vault::provision::create_service_dirs;
use crate::state::AppState;
use tauri::State;

/// Create a microservice and the vault directory holding its files.
#[tauri::command]
pub async fn create_service(
    state: State<'_, AppState>,
    service: CreateServiceDTO,
) -> Result<Service, String> {
    let created = ServiceRepo::new(&state.db).create(&service).await?;

    create_service_dirs(&state.vault_dir, &created.platform_id, &created.id).await?;

    Ok(created)
}
