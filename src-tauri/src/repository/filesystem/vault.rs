use super::layout::{relative_to, resolve_in};
use crate::domain::vault::entity::{DirListing, MarkdownFile, VaultFile, VaultFolder};
use crate::domain::vault::repository::VaultRepository;
use std::path::{Path, PathBuf};

/// Filesystem store for the user files of one scope. `base` is the scope's
/// already-resolved root directory (see `service::vault::scope_dir`); every
/// path handled here is relative to it, so the repository is structurally
/// unable to touch another platform's or service's files.
pub struct VaultRepo {
    base: PathBuf,
}

impl VaultRepo {
    pub fn new(base: PathBuf) -> Self {
        Self { base }
    }

    fn resolve(&self, path: &str) -> Result<PathBuf, String> {
        resolve_in(&self.base, path)
    }

    fn rel(&self, path: &Path) -> Result<String, String> {
        relative_to(&self.base, path)
    }
}

impl VaultRepository for VaultRepo {
    /// A folder that does not exist yet lists as empty: scope directories are
    /// created lazily, so an untouched platform must not read as an error.
    async fn list(&self, path: &str) -> Result<DirListing, String> {
        let dir = self.resolve(path)?;

        let mut folders = Vec::new();
        let mut files = Vec::new();

        let mut rd = match tokio::fs::read_dir(&dir).await {
            Ok(rd) => rd,
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => {
                return Ok(DirListing { folders, files });
            }
            Err(e) => return Err(e.to_string()),
        };

        while let Some(entry) = rd.next_entry().await.map_err(|e| e.to_string())? {
            let entry_path = entry.path();
            let name = entry.file_name().to_string_lossy().to_string();
            let ft = entry.file_type().await.map_err(|e| e.to_string())?;

            if ft.is_dir() {
                folders.push(VaultFolder {
                    path: self.rel(&entry_path)?,
                    name,
                    children_count: count_children(&entry_path).await?,
                });
            } else {
                let meta = entry.metadata().await.map_err(|e| e.to_string())?;
                files.push(VaultFile {
                    path: self.rel(&entry_path)?,
                    name,
                    size: meta.len(),
                    updated: modified_secs(&meta),
                });
            }
        }

        folders.sort_by(|a, b| a.name.cmp(&b.name));
        files.sort_by(|a, b| a.name.cmp(&b.name));

        Ok(DirListing { folders, files })
    }

    async fn read_markdown(&self, path: &str) -> Result<Option<MarkdownFile>, String> {
        let abs = self.resolve(path)?;

        let content = match tokio::fs::read_to_string(&abs).await {
            Ok(content) => content,
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => return Ok(None),
            Err(e) => return Err(e.to_string()),
        };
        let meta = tokio::fs::metadata(&abs).await.map_err(|e| e.to_string())?;

        Ok(Some(MarkdownFile {
            path: self.rel(&abs)?,
            name: abs
                .file_name()
                .and_then(|s| s.to_str())
                .unwrap_or_default()
                .to_string(),
            content,
            size: meta.len(),
            updated: modified_secs(&meta),
        }))
    }

    async fn create_file(&self, path: &str, name: &str, content: &str) -> Result<String, String> {
        let dir = self.resolve(path)?;
        let abs = resolve_in(&dir, name)?;

        if tokio::fs::try_exists(&abs).await.map_err(|e| e.to_string())? {
            return Err(format!("file already exists: {name}"));
        }

        tokio::fs::create_dir_all(&dir)
            .await
            .map_err(|e| e.to_string())?;
        tokio::fs::write(&abs, content)
            .await
            .map_err(|e| e.to_string())?;

        self.rel(&abs)
    }

    async fn write_file(&self, path: &str, content: &str) -> Result<(), String> {
        let abs = self.resolve(path)?;

        if !tokio::fs::try_exists(&abs).await.map_err(|e| e.to_string())? {
            return Err(format!("file not found: {path}"));
        }

        tokio::fs::write(&abs, content)
            .await
            .map_err(|e| e.to_string())
    }

    /// The original name is kept; on collision a numeric suffix (` (1)`, ` (2)`,
    /// …) is appended so a drop never overwrites existing data.
    async fn import_file(&self, path: &str, src: &Path) -> Result<String, String> {
        let file_name = src
            .file_name()
            .and_then(|n| n.to_str())
            .ok_or_else(|| "invalid source file name".to_string())?;

        if !tokio::fs::try_exists(src).await.map_err(|e| e.to_string())? {
            return Err(format!("source file not found: {}", src.display()));
        }

        let dir = self.resolve(path)?;
        tokio::fs::create_dir_all(&dir)
            .await
            .map_err(|e| e.to_string())?;

        let (stem, ext) = split_name(file_name);
        let mut candidate = file_name.to_string();
        let mut n = 1;
        while tokio::fs::try_exists(resolve_in(&dir, &candidate)?)
            .await
            .map_err(|e| e.to_string())?
        {
            candidate = match &ext {
                Some(ext) => format!("{stem} ({n}).{ext}"),
                None => format!("{stem} ({n})"),
            };
            n += 1;
        }

        let dest = resolve_in(&dir, &candidate)?;
        tokio::fs::copy(src, &dest)
            .await
            .map_err(|e| e.to_string())?;

        self.rel(&dest)
    }

    /// Missing files are treated as already deleted.
    async fn delete_file(&self, path: &str) -> Result<(), String> {
        let abs = self.resolve(path)?;
        match tokio::fs::remove_file(&abs).await {
            Ok(()) => Ok(()),
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(()),
            Err(e) => Err(e.to_string()),
        }
    }

    async fn create_dir(&self, path: &str, name: &str) -> Result<String, String> {
        let name = name.trim();
        let dir = self.resolve(path)?;
        let abs = resolve_in(&dir, name)?;

        if tokio::fs::try_exists(&abs).await.map_err(|e| e.to_string())? {
            return Err(format!("folder already exists: {name}"));
        }

        tokio::fs::create_dir_all(&abs)
            .await
            .map_err(|e| e.to_string())?;

        self.rel(&abs)
    }

    /// Deletes the folder and everything inside it. Missing folders are treated
    /// as already deleted; the scope root itself cannot be removed.
    async fn delete_dir(&self, path: &str) -> Result<(), String> {
        if path.is_empty() {
            return Err("cannot delete the scope root".to_string());
        }

        let abs = self.resolve(path)?;
        match tokio::fs::remove_dir_all(&abs).await {
            Ok(()) => Ok(()),
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(()),
            Err(e) => Err(e.to_string()),
        }
    }
}

/// Last modification time as unix seconds, `0` when the platform does not
/// report one.
fn modified_secs(meta: &std::fs::Metadata) -> i64 {
    meta.modified()
        .ok()
        .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0)
}

/// Split a filename into its stem and optional extension. A leading dot
/// (dotfiles like `.gitignore`) is part of the stem, not an extension, so
/// collision suffixes read `.gitignore (1)`.
fn split_name(name: &str) -> (String, Option<String>) {
    match name.rfind('.') {
        Some(i) if i > 0 => (name[..i].to_string(), Some(name[i + 1..].to_string())),
        _ => (name.to_string(), None),
    }
}

/// Count the direct entries of a directory without descending into it.
async fn count_children(dir: &Path) -> Result<u64, String> {
    let mut rd = tokio::fs::read_dir(dir).await.map_err(|e| e.to_string())?;
    let mut count = 0u64;
    while rd.next_entry().await.map_err(|e| e.to_string())?.is_some() {
        count += 1;
    }
    Ok(count)
}
