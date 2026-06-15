use super::model::{
    CreateMarkdownDTO, DirListing, FileEntry, FolderEntry, MarkdownFile, UpdateMarkdownDTO,
};
use std::path::{Path, PathBuf};

/// Filesystem-backed store for markdown files. Everything lives under
/// `vault_dir`: directories are folders, files are documents, and `author`
/// metadata is kept in a small YAML frontmatter block at the top of each file.
pub struct MarkdownRepo<'a> {
    pub vault_dir: &'a Path,
}

impl<'a> MarkdownRepo<'a> {
    pub fn new(vault_dir: &'a Path) -> Self {
        Self { vault_dir }
    }

    /// Resolve a vault-relative id to an absolute path, rejecting any component
    /// that could escape the vault (`..`, empty, backslashes).
    fn resolve(&self, id: &str) -> Result<PathBuf, String> {
        if id.is_empty() {
            return Err("invalid markdown id".to_string());
        }

        let mut path = self.vault_dir.to_path_buf();
        for comp in id.split('/') {
            if comp.is_empty() || comp == "." || comp == ".." || comp.contains('\\') {
                return Err("invalid markdown id".to_string());
            }
            path.push(comp);
        }
        Ok(path)
    }

    /// Vault-relative id for an absolute path, always using `/` separators.
    fn rel_id(&self, path: &Path) -> Result<String, String> {
        let rel = path
            .strip_prefix(self.vault_dir)
            .map_err(|e| e.to_string())?;
        Ok(rel
            .components()
            .map(|c| c.as_os_str().to_string_lossy())
            .collect::<Vec<_>>()
            .join("/"))
    }

    /// Read every `*.md` file in the vault tree as a full `MarkdownFile`,
    /// sorted by id for a stable listing.
    pub async fn all(&self) -> Result<Vec<MarkdownFile>, String> {
        let mut out = Vec::new();
        let mut stack = vec![self.vault_dir.to_path_buf()];

        while let Some(dir) = stack.pop() {
            let mut rd = match tokio::fs::read_dir(&dir).await {
                Ok(rd) => rd,
                Err(e) if e.kind() == std::io::ErrorKind::NotFound => continue,
                Err(e) => return Err(e.to_string()),
            };

            while let Some(entry) = rd.next_entry().await.map_err(|e| e.to_string())? {
                let path = entry.path();
                let ft = entry.file_type().await.map_err(|e| e.to_string())?;

                if ft.is_dir() {
                    stack.push(path);
                } else if path.extension().and_then(|e| e.to_str()) == Some("md") {
                    out.push(self.load(&path).await?);
                }
            }
        }

        out.sort_by(|a, b| a.id.cmp(&b.id));
        Ok(out)
    }

    /// List the direct children of a folder inside the vault, split into
    /// sub-folders and files. `folder` is a vault-relative path; an empty
    /// string lists the vault root. A missing folder lists as empty.
    pub async fn list(&self, folder: &str) -> Result<DirListing, String> {
        let dir = if folder.is_empty() {
            self.vault_dir.to_path_buf()
        } else {
            self.resolve(folder)?
        };

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
            let path = entry.path();
            let ft = entry.file_type().await.map_err(|e| e.to_string())?;
            let name = entry.file_name().to_string_lossy().to_string();

            if ft.is_dir() {
                folders.push(FolderEntry {
                    id: self.rel_id(&path)?,
                    name,
                    children_count: count_children(&path).await?,
                });
            } else {
                let meta = entry.metadata().await.map_err(|e| e.to_string())?;
                files.push(FileEntry {
                    name,
                    size: meta.len(),
                });
            }
        }

        folders.sort_by(|a, b| a.name.cmp(&b.name));
        files.sort_by(|a, b| a.name.cmp(&b.name));

        Ok(DirListing { folders, files })
    }

    /// Read a single file by id, or `None` if it does not exist.
    pub async fn find(&self, id: &str) -> Result<Option<MarkdownFile>, String> {
        let path = self.resolve(id)?;
        match tokio::fs::metadata(&path).await {
            Ok(_) => Ok(Some(self.load(&path).await?)),
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(None),
            Err(e) => Err(e.to_string()),
        }
    }

    /// Create a new file, failing if one already exists at the target path.
    /// Returns the id (vault-relative path) of the created file.
    pub async fn create(&self, dto: &CreateMarkdownDTO) -> Result<String, String> {
        let rel = if dto.folder.is_empty() {
            dto.name.clone()
        } else {
            format!("{}/{}", dto.folder.trim_matches('/'), dto.name)
        };

        let path = self.resolve(&rel)?;

        if tokio::fs::try_exists(&path).await.map_err(|e| e.to_string())? {
            return Err(format!("markdown file already exists: {rel}"));
        }

        if let Some(parent) = path.parent() {
            tokio::fs::create_dir_all(parent)
                .await
                .map_err(|e| e.to_string())?;
        }

        tokio::fs::write(&path, build_file(&dto.author, &dto.content))
            .await
            .map_err(|e| e.to_string())?;

        Ok(rel)
    }

    /// Create a new sub-folder, failing if anything already exists at the
    /// target path. Returns the id (vault-relative path) of the created folder.
    pub async fn create_dir(&self, parent: &str, name: &str) -> Result<String, String> {
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

    /// Copy an external file (e.g. one dragged in from the OS) into the vault
    /// under `folder`, keeping its original name. When a file with that name
    /// already exists, a numeric suffix (` (1)`, ` (2)`, …) is appended so the
    /// drop never overwrites existing data. Returns the stored file's id.
    pub async fn import(&self, src: &Path, folder: &str) -> Result<String, String> {
        let file_name = src
            .file_name()
            .and_then(|n| n.to_str())
            .ok_or_else(|| "invalid source file name".to_string())?;

        if !tokio::fs::try_exists(src).await.map_err(|e| e.to_string())? {
            return Err(format!("source file not found: {}", src.display()));
        }

        let dir = if folder.is_empty() {
            self.vault_dir.to_path_buf()
        } else {
            self.resolve(folder)?
        };
        tokio::fs::create_dir_all(&dir)
            .await
            .map_err(|e| e.to_string())?;

        // Find a destination name that doesn't collide with an existing entry.
        let (stem, ext) = split_name(file_name);
        let mut candidate = file_name.to_string();
        let mut n = 1;
        while tokio::fs::try_exists(dir.join(&candidate))
            .await
            .map_err(|e| e.to_string())?
        {
            candidate = match &ext {
                Some(ext) => format!("{stem} ({n}).{ext}"),
                None => format!("{stem} ({n})"),
            };
            n += 1;
        }

        let dest = dir.join(&candidate);
        tokio::fs::copy(src, &dest)
            .await
            .map_err(|e| e.to_string())?;

        self.rel_id(&dest)
    }

    /// Delete a folder and everything inside it. Missing folders are treated as
    /// already deleted.
    pub async fn delete_dir(&self, id: &str) -> Result<(), String> {
        let path = self.resolve(id)?;
        match tokio::fs::remove_dir_all(&path).await {
            Ok(()) => Ok(()),
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(()),
            Err(e) => Err(e.to_string()),
        }
    }

    /// Overwrite the author and body of an existing file.
    pub async fn update(&self, dto: &UpdateMarkdownDTO) -> Result<String, String> {
        let path = self.resolve(&dto.id)?;

        if !tokio::fs::try_exists(&path).await.map_err(|e| e.to_string())? {
            return Err(format!("markdown file not found: {}", dto.id));
        }

        tokio::fs::write(&path, build_file(&dto.author, &dto.content))
            .await
            .map_err(|e| e.to_string())?;

        Ok(dto.id.clone())
    }

    /// Delete a file. Missing files are treated as already deleted.
    pub async fn delete(&self, id: &str) -> Result<(), String> {
        let path = self.resolve(id)?;
        match tokio::fs::remove_file(&path).await {
            Ok(()) => Ok(()),
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(()),
            Err(e) => Err(e.to_string()),
        }
    }

    /// Build a `MarkdownFile` from an on-disk path and its metadata.
    async fn load(&self, path: &Path) -> Result<MarkdownFile, String> {
        let raw = tokio::fs::read_to_string(path)
            .await
            .map_err(|e| e.to_string())?;
        let meta = tokio::fs::metadata(path).await.map_err(|e| e.to_string())?;

        let (author, content) = split_frontmatter(&raw);

        let rel = path
            .strip_prefix(self.vault_dir)
            .map_err(|e| e.to_string())?;
        let folder = rel
            .parent()
            .filter(|p| !p.as_os_str().is_empty())
            .map(|p| {
                p.components()
                    .map(|c| c.as_os_str().to_string_lossy())
                    .collect::<Vec<_>>()
                    .join("/")
            })
            .unwrap_or_default();
        let name = rel
            .file_name()
            .and_then(|s| s.to_str())
            .unwrap_or_default()
            .to_string();

        let updated = meta
            .modified()
            .ok()
            .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
            .map(|d| d.as_secs() as i64)
            .unwrap_or(0);

        Ok(MarkdownFile {
            id: self.rel_id(path)?,
            folder,
            name,
            author,
            content,
            size: meta.len(),
            updated,
        })
    }
}

/// Split a filename into its stem and optional extension. A leading dot
/// (dotfiles like `.gitignore`) is treated as part of the stem, not an
/// extension, so collision suffixes read `.gitignore (1)`.
fn split_name(name: &str) -> (String, Option<String>) {
    match name.rfind('.') {
        Some(i) if i > 0 => (name[..i].to_string(), Some(name[i + 1..].to_string())),
        _ => (name.to_string(), None),
    }
}

/// Count the direct entries (files + sub-folders) inside a directory, without
/// descending into it.
async fn count_children(dir: &Path) -> Result<u64, String> {
    let mut rd = tokio::fs::read_dir(dir).await.map_err(|e| e.to_string())?;
    let mut count = 0u64;
    while rd.next_entry().await.map_err(|e| e.to_string())?.is_some() {
        count += 1;
    }
    Ok(count)
}

/// Split an optional leading `---` frontmatter block off the body and pull the
/// `author` field out of it. Files without frontmatter return an empty author
/// and the whole text as the body, so plain `.md` files keep working.
fn split_frontmatter(raw: &str) -> (String, String) {
    if let Some(rest) = raw.strip_prefix("---\n") {
        if let Some(end) = rest.find("\n---\n") {
            let front = &rest[..end];
            let body = &rest[end + "\n---\n".len()..];

            let author = front
                .lines()
                .find_map(|line| line.strip_prefix("author:"))
                .map(|v| v.trim().trim_matches('"').to_string())
                .unwrap_or_default();

            return (author, body.to_string());
        }
    }

    (String::new(), raw.to_string())
}

/// Prepend a frontmatter block with the author when one is set; otherwise write
/// the body verbatim so files stay clean when there is no metadata.
fn build_file(author: &str, content: &str) -> String {
    let author = author.trim();
    if author.is_empty() {
        content.to_string()
    } else {
        format!("---\nauthor: {author}\n---\n\n{content}")
    }
}
