use crate::domain::domain::repository::DomainRepository;
use crate::domain::vault::scope::FileScope;
use crate::repository::filesystem::layout::VaultLayout;
use crate::repository::filesystem::vault::VaultRepo;
use crate::repository::sqlite::domain::DomainRepo;
use crate::state::AppState;
use std::path::PathBuf;

/// Resolve a scope to the directory holding its user files. A domain scope is
/// resolved through the database (`domains.platform_id`), which is why the
/// frontend only ever names the domain — a domain that moved to another
/// platform stays addressable by the same id.
pub async fn scope_dir(state: &AppState, scope: &FileScope) -> Result<PathBuf, String> {
    let layout = VaultLayout::new(&state.vault_dir);

    match scope {
        FileScope::Platform { platform_id } => layout.platform_files(platform_id),
        FileScope::Domain { domain_id } => {
            let domain = DomainRepo::new(&state.db)
                .find_by_id(domain_id)
                .await?
                .ok_or_else(|| format!("domain not found: {domain_id}"))?;

            layout.domain_files(&domain.platform_id, domain_id)
        }
    }
}

/// A repository bound to `scope`, able to reach nothing outside it.
pub async fn scope_repo(state: &AppState, scope: &FileScope) -> Result<VaultRepo, String> {
    Ok(VaultRepo::new(scope_dir(state, scope).await?))
}
