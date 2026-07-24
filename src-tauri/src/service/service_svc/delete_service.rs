use crate::domain::service::repository::ServiceRepository;
use crate::repository::sqlite::service::ServiceRepo;
use crate::service::vault::provision::delete_service_dirs;
use crate::state::AppState;
use tauri::State;

/// Delete a microservice together with its files. The directory is removed
/// first: a failure there leaves the row in place, so the files stay reachable
/// instead of becoming unaddressable garbage.
#[tauri::command]
pub async fn delete_service(state: State<'_, AppState>, id: String) -> Result<(), String> {
    let repo = ServiceRepo::new(&state.db);

    if let Some(service) = repo.find_by_id(&id).await? {
        delete_service_dirs(&state.vault_dir, &service.platform_id, &service.id).await?;
    }

    repo.delete(&id).await
}
