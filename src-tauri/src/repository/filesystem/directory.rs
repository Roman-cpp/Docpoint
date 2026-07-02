use crate::domain::directory::repository::DirectoryRepository;
use std::path::{Path, PathBuf};

/// Filesystem-backed store for vault folders. Directories live under
/// `vault_dir` and are identified by their vault-relative path.
pub struct DirectoryRepo<'a> {
    pub vault_dir: &'a Path,
}

impl<'a> DirectoryRepo<'a> {
    pub fn new(vault_dir: &'a Path) -> Self {
        Self { vault_dir }
    }

    /// Resolve a vault-relative id to an absolute path, rejecting any component
    /// that could escape the vault (`..`, empty, backslashes).
    fn resolve(&self, id: &str) -> Result<PathBuf, String> {
        if id.is_empty() {
            return Err("invalid directory id".to_string());
        }

        let mut path = self.vault_dir.to_path_buf();
        for comp in id.split('/') {
            if comp.is_empty() || comp == "." || comp == ".." || comp.contains('\\') {
                return Err("invalid directory id".to_string());
            }
            path.push(comp);
        }
        Ok(path)
    }
}

impl DirectoryRepository for DirectoryRepo<'_> {
    /// Create a new sub-folder, failing if anything already exists at the
    /// target path. Returns the id (vault-relative path) of the created folder.
    async fn create_dir(&self, parent: &str, name: &str) -> Result<String, String> {
        let name = name.trim();
        if name.is_empty() || name.contains('/') {
            return Err("invalid folder name".to_string());
        }

        let rel = if parent.is_empty() {
            name.to_string()
        } else {
            format!("{}/{}", parent.trim_matches('/'), name)
        };

        let path = self.resolve(&rel)?;

        if tokio::fs::try_exists(&path).await.map_err(|e| e.to_string())? {
            return Err(format!("folder already exists: {rel}"));
        }

        tokio::fs::create_dir_all(&path)
            .await
            .map_err(|e| e.to_string())?;

        Ok(rel)
    }

    /// Delete a folder and everything inside it. Missing folders are treated as
    /// already deleted.
    async fn delete_dir(&self, id: &str) -> Result<(), String> {
        let path = self.resolve(id)?;
        match tokio::fs::remove_dir_all(&path).await {
            Ok(()) => Ok(()),
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(()),
            Err(e) => Err(e.to_string()),
        }
    }
}
