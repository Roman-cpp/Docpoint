use super::layout::safe_id;
use crate::domain::doc_api::doc_content::repository::DocContentRepository;
use std::path::{Path, PathBuf};

/// Filesystem store for doc-api bodies: one `<doc_id>.md` per doc, flat inside
/// `root`. `root` sits next to the vault rather than inside it, which is what
/// keeps these files out of the file explorer.
pub struct DocContentRepo<'a> {
    root: &'a Path,
}

impl<'a> DocContentRepo<'a> {
    pub fn new(root: &'a Path) -> Self {
        Self { root }
    }

    fn path(&self, doc_id: &str) -> Result<PathBuf, String> {
        Ok(self.root.join(format!("{}.md", safe_id(doc_id)?)))
    }
}

impl DocContentRepository for DocContentRepo<'_> {
    async fn read(&self, doc_id: &str) -> Result<String, String> {
        let path = self.path(doc_id)?;

        match tokio::fs::read_to_string(&path).await {
            Ok(content) => Ok(content),
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(String::new()),
            Err(e) => Err(e.to_string()),
        }
    }

    async fn write(&self, doc_id: &str, content: &str) -> Result<(), String> {
        let path = self.path(doc_id)?;

        tokio::fs::create_dir_all(self.root)
            .await
            .map_err(|e| e.to_string())?;

        tokio::fs::write(&path, content)
            .await
            .map_err(|e| e.to_string())
    }

    /// Missing bodies are treated as already deleted: a doc that was never
    /// opened has no file, and deleting it must still succeed.
    async fn delete(&self, doc_id: &str) -> Result<(), String> {
        let path = self.path(doc_id)?;

        match tokio::fs::remove_file(&path).await {
            Ok(()) => Ok(()),
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(()),
            Err(e) => Err(e.to_string()),
        }
    }
}
