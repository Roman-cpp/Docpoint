use serde::{Deserialize, Serialize};

/// A markdown file as it lives on disk. `folder`/`name`/`id` are derived from
/// the path inside the vault, `author` comes from the YAML frontmatter, and
/// `size`/`updated` are read from filesystem metadata.
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MarkdownFile {
    /// Vault-relative path with `/` separators, e.g. `Документация/quickstart.md`.
    pub id: String,
    /// Parent directory inside the vault, empty string for files at the root.
    pub folder: String,
    pub name: String,
    pub author: String,
    /// Body of the document, frontmatter stripped.
    pub content: String,
    /// Size of the file on disk, in bytes. Format for display on the frontend.
    pub size: u64,
    /// Last modification time, unix seconds. Format for display on the frontend.
    pub updated: i64,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateMarkdownDTO {
    /// Target directory inside the vault. Empty string writes to the root.
    pub folder: String,
    /// File name including the `.md` extension.
    pub name: String,
    pub author: String,
    pub content: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateMarkdownDTO {
    pub id: String,
    pub author: String,
    pub content: String,
}
