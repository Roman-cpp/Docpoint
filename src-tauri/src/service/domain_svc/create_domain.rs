use crate::domain::domain::dto::CreateDomainDTO;
use crate::domain::domain::entity::Domain;
use crate::domain::domain::repository::DomainRepository;
use crate::repository::sqlite::domain::DomainRepo;
use crate::service::vault::provision::create_domain_dirs;
use crate::state::AppState;
use tauri::State;

/// Create a domain and the vault directory holding its files.
#[tauri::command]
pub async fn create_domain(
    state: State<'_, AppState>,
    domain: CreateDomainDTO,
) -> Result<Domain, String> {
    let created = DomainRepo::new(&state.db).create(&domain).await?;

    create_domain_dirs(&state.vault_dir, &created.platform_id, &created.id).await?;

    Ok(created)
}
