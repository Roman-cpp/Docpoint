use crate::domain::domain::dto::UpdateDomainDTO;
use crate::domain::domain::repository::DomainRepository;
use crate::repository::sqlite::domain::DomainRepo;
use crate::service::vault::provision::move_domain_dirs;
use crate::state::AppState;
use tauri::State;

/// Update a domain. Re-homing it onto another platform moves its files
/// with it, so the vault keeps mirroring the database.
#[tauri::command]
pub async fn update_domain(
    state: State<'_, AppState>,
    domain: UpdateDomainDTO,
) -> Result<(), String> {
    let repo = DomainRepo::new(&state.db);

    let previous = repo
        .find_by_id(&domain.id)
        .await?
        .ok_or_else(|| format!("domain not found: {}", domain.id))?;

    // Move the files before the row: if the move fails the database still
    // points at where the files actually are.
    move_domain_dirs(
        &state.vault_dir,
        &domain.id,
        &previous.platform_id,
        &domain.platform_id,
    )
    .await?;

    repo.update(&domain).await
}
