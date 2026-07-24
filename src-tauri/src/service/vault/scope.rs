use crate::domain::service::repository::ServiceRepository;
use crate::domain::vault::scope::FileScope;
use crate::repository::filesystem::layout::VaultLayout;
use crate::repository::filesystem::vault::VaultRepo;
use crate::repository::sqlite::service::ServiceRepo;
use crate::state::AppState;
use std::path::PathBuf;

/// Resolve a scope to the directory holding its user files. A service scope is
/// resolved through the database (`services.platform_id`), which is why the
/// frontend only ever names the service — a service that moved to another
/// platform stays addressable by the same id.
pub async fn scope_dir(state: &AppState, scope: &FileScope) -> Result<PathBuf, String> {
    let layout = VaultLayout::new(&state.vault_dir);

    match scope {
        FileScope::Platform { platform_id } => layout.platform_files(platform_id),
        FileScope::Service { service_id } => {
            let service = ServiceRepo::new(&state.db)
                .find_by_id(service_id)
                .await?
                .ok_or_else(|| format!("service not found: {service_id}"))?;

            layout.service_files(&service.platform_id, service_id)
        }
    }
}

/// A repository bound to `scope`, able to reach nothing outside it.
pub async fn scope_repo(state: &AppState, scope: &FileScope) -> Result<VaultRepo, String> {
    Ok(VaultRepo::new(scope_dir(state, scope).await?))
}
