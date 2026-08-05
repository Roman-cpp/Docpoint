use crate::domain::domain::repository::DomainRepository;
use crate::repository::sqlite::domain::DomainRepo;
use crate::service::vault::provision::delete_domain_dirs;
use crate::state::AppState;
use tauri::State;

/// Delete a domain together with its files. The directory is removed
/// first: a failure there leaves the row in place, so the files stay reachable
/// instead of becoming unaddressable garbage.
#[tauri::command]
pub async fn delete_domain(state: State<'_, AppState>, id: String) -> Result<(), String> {
    let repo = DomainRepo::new(&state.db);

    if let Some(domain) = repo.find_by_id(&id).await? {
        delete_domain_dirs(&state.vault_dir, &domain.platform_id, &domain.id).await?;
    }

    repo.delete(&id).await
}
