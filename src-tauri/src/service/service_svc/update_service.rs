use crate::domain::service::dto::UpdateServiceDTO;
use crate::domain::service::repository::ServiceRepository;
use crate::repository::sqlite::service::ServiceRepo;
use crate::service::vault::provision::move_service_dirs;
use crate::state::AppState;
use tauri::State;

/// Update a microservice. Re-homing it onto another platform moves its files
/// with it, so the vault keeps mirroring the database.
#[tauri::command]
pub async fn update_service(
    state: State<'_, AppState>,
    service: UpdateServiceDTO,
) -> Result<(), String> {
    let repo = ServiceRepo::new(&state.db);

    let previous = repo
        .find_by_id(&service.id)
        .await?
        .ok_or_else(|| format!("service not found: {}", service.id))?;

    // Move the files before the row: if the move fails the database still
    // points at where the files actually are.
    move_service_dirs(
        &state.vault_dir,
        &service.id,
        &previous.platform_id,
        &service.platform_id,
    )
    .await?;

    repo.update(&service).await
}
