use super::entity::{DirListing, MarkdownFile};
use std::path::Path;

/// File operations inside a single already-resolved scope. Every `path` is
/// relative to that scope's root (`""` addresses the root itself), so an
/// implementation cannot reach another platform's or domain's files.
pub trait VaultRepository {
    async fn list(&self, path: &str) -> Result<DirListing, String>;
    async fn read_markdown(&self, path: &str) -> Result<Option<MarkdownFile>, String>;
    /// Create `<path>/<name>`, failing if it already exists. Returns its
    /// scope-relative path.
    async fn create_file(&self, path: &str, name: &str, content: &str) -> Result<String, String>;
    async fn write_file(&self, path: &str, content: &str) -> Result<(), String>;
    /// Copy an external file into `path`, keeping its name. Returns the stored
    /// file's scope-relative path.
    async fn import_file(&self, path: &str, src: &Path) -> Result<String, String>;
    async fn delete_file(&self, path: &str) -> Result<(), String>;
    /// Create the folder `<path>/<name>`. Returns its scope-relative path.
    async fn create_dir(&self, path: &str, name: &str) -> Result<String, String>;
    async fn delete_dir(&self, path: &str) -> Result<(), String>;
    /// Move a file or folder to `to`, a scope-relative path that must be free.
    /// Renaming is the same operation with an unchanged parent. Returns the
    /// entry's new path.
    async fn move_entry(&self, from: &str, to: &str) -> Result<String, String>;
}
