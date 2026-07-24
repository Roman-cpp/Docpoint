use crate::repository::filesystem::layout::VaultLayout;
use std::path::Path;

/// Create the file directory of a freshly created platform, so its files tab
/// opens on a real folder instead of a lazily created one.
pub async fn create_platform_dirs(vault_dir: &Path, platform_id: &str) -> Result<(), String> {
    let dir = VaultLayout::new(vault_dir).platform_files(platform_id)?;
    tokio::fs::create_dir_all(&dir)
        .await
        .map_err(|e| e.to_string())
}

/// Drop a platform's whole subtree — its own files and every service under it.
/// Mirrors the `ON DELETE CASCADE` from `platforms` to `services`.
pub async fn delete_platform_dirs(vault_dir: &Path, platform_id: &str) -> Result<(), String> {
    let dir = VaultLayout::new(vault_dir).platform_dir(platform_id)?;
    remove_dir(&dir).await
}

pub async fn create_service_dirs(
    vault_dir: &Path,
    platform_id: &str,
    service_id: &str,
) -> Result<(), String> {
    let dir = VaultLayout::new(vault_dir).service_files(platform_id, service_id)?;
    tokio::fs::create_dir_all(&dir)
        .await
        .map_err(|e| e.to_string())
}

pub async fn delete_service_dirs(
    vault_dir: &Path,
    platform_id: &str,
    service_id: &str,
) -> Result<(), String> {
    let dir = VaultLayout::new(vault_dir).service_dir(platform_id, service_id)?;
    remove_dir(&dir).await
}

/// Follow a service that was re-homed onto another platform, so its files move
/// with it. A service with no directory yet is simply created at the new
/// location.
pub async fn move_service_dirs(
    vault_dir: &Path,
    service_id: &str,
    from_platform: &str,
    to_platform: &str,
) -> Result<(), String> {
    if from_platform == to_platform {
        return Ok(());
    }

    let layout = VaultLayout::new(vault_dir);
    let from = layout.service_dir(from_platform, service_id)?;
    let to = layout.service_dir(to_platform, service_id)?;

    if !tokio::fs::try_exists(&from).await.map_err(|e| e.to_string())? {
        return create_service_dirs(vault_dir, to_platform, service_id).await;
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
