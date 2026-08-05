use crate::repository::filesystem::layout::VaultLayout;
use std::path::Path;

/// Markdown file holding the long-form description of a platform. It lives
/// among the platform's own files, so the existing viewer, editor and file
/// browser all work on it without a special case. The frontend reads it by the
/// same name — see `entities/platform/lib/description.ts`.
pub const PLATFORM_DESCRIPTION_FILE: &str = "README.md";

/// Create the file directory of a freshly created platform, so its files tab
/// opens on a real folder instead of a lazily created one.
pub async fn create_platform_dirs(vault_dir: &Path, platform_id: &str) -> Result<(), String> {
    let dir = VaultLayout::new(vault_dir).platform_files(platform_id)?;
    tokio::fs::create_dir_all(&dir)
        .await
        .map_err(|e| e.to_string())
}

/// Seed the description file of a freshly created platform, so its details tab
/// opens on a real document. An existing file is left untouched — the user's
/// text always wins over the template.
pub async fn create_platform_description(
    vault_dir: &Path,
    platform_id: &str,
    name: &str,
    desc: &str,
) -> Result<(), String> {
    let file = VaultLayout::new(vault_dir)
        .platform_files(platform_id)?
        .join(PLATFORM_DESCRIPTION_FILE);

    if tokio::fs::try_exists(&file).await.map_err(|e| e.to_string())? {
        return Ok(());
    }

    tokio::fs::write(&file, description_template(name, desc))
        .await
        .map_err(|e| e.to_string())
}

/// Initial body of a platform description: its name as the title, followed by
/// the short description typed in the create dialog when there is one.
fn description_template(name: &str, desc: &str) -> String {
    let body = if desc.trim().is_empty() {
        "Описание платформы пока не заполнено."
    } else {
        desc.trim()
    };
    format!("# {name}\n\n{body}\n")
}

/// Follow the `services` -> `domains` rename of migration 0029 on disk, so a
/// vault written by an older build keeps resolving. Runs once per start and is
/// a no-op as soon as no platform has a `services` folder left.
///
/// A platform that somehow has both folders is left alone: merging them could
/// silently overwrite user files, so the stale `services` tree stays where it
/// is rather than being guessed at.
pub async fn migrate_vault_layout(vault_dir: &Path) -> Result<(), String> {
    let platforms = vault_dir.join("platforms");
    let mut entries = match tokio::fs::read_dir(&platforms).await {
        Ok(entries) => entries,
        // A vault with no platforms yet has nothing to migrate.
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => return Ok(()),
        Err(e) => return Err(e.to_string()),
    };

    while let Some(entry) = entries.next_entry().await.map_err(|e| e.to_string())? {
        let old = entry.path().join("services");
        let new = entry.path().join("domains");

        if !tokio::fs::try_exists(&old).await.map_err(|e| e.to_string())?
            || tokio::fs::try_exists(&new).await.map_err(|e| e.to_string())?
        {
            continue;
        }

        tokio::fs::rename(&old, &new)
            .await
            .map_err(|e| e.to_string())?;
    }

    Ok(())
}

/// Drop a platform's whole subtree — its own files and every domain under it.
/// Mirrors the `ON DELETE CASCADE` from `platforms` to `domains`.
pub async fn delete_platform_dirs(vault_dir: &Path, platform_id: &str) -> Result<(), String> {
    let dir = VaultLayout::new(vault_dir).platform_dir(platform_id)?;
    remove_dir(&dir).await
}

pub async fn create_domain_dirs(
    vault_dir: &Path,
    platform_id: &str,
    domain_id: &str,
) -> Result<(), String> {
    let dir = VaultLayout::new(vault_dir).domain_files(platform_id, domain_id)?;
    tokio::fs::create_dir_all(&dir)
        .await
        .map_err(|e| e.to_string())
}

pub async fn delete_domain_dirs(
    vault_dir: &Path,
    platform_id: &str,
    domain_id: &str,
) -> Result<(), String> {
    let dir = VaultLayout::new(vault_dir).domain_dir(platform_id, domain_id)?;
    remove_dir(&dir).await
}

/// Follow a domain that was re-homed onto another platform, so its files move
/// with it. A domain with no directory yet is simply created at the new
/// location.
pub async fn move_domain_dirs(
    vault_dir: &Path,
    domain_id: &str,
    from_platform: &str,
    to_platform: &str,
) -> Result<(), String> {
    if from_platform == to_platform {
        return Ok(());
    }

    let layout = VaultLayout::new(vault_dir);
    let from = layout.domain_dir(from_platform, domain_id)?;
    let to = layout.domain_dir(to_platform, domain_id)?;

    if !tokio::fs::try_exists(&from).await.map_err(|e| e.to_string())? {
        return create_domain_dirs(vault_dir, to_platform, domain_id).await;
    }

    if let Some(parent) = to.parent() {
        tokio::fs::create_dir_all(parent)
            .await
            .map_err(|e| e.to_string())?;
    }

    tokio::fs::rename(&from, &to)
        .await
        .map_err(|e| e.to_string())
}

/// Missing directories are treated as already deleted, so a failed create or a
/// manually cleaned vault never blocks deleting the database row.
async fn remove_dir(dir: &Path) -> Result<(), String> {
    match tokio::fs::remove_dir_all(dir).await {
        Ok(()) => Ok(()),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(()),
        Err(e) => Err(e.to_string()),
    }
}
