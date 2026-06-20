use serde::Serialize;

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

/// A file directly inside a folder, as shown in the file explorer.
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FileEntry {
    pub name: String,
    /// Size of the file on disk, in bytes. Format for display on the frontend.
    pub size: u64,
}

/// A sub-folder directly inside a folder, as shown in the file explorer.
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FolderEntry {
    /// Vault-relative path with `/` separators, used as a stable id.
    pub id: String,
    pub name: String,
    /// Number of direct children (files + sub-folders) inside the folder.
    pub children_count: u64,
}

/// Direct contents of a single folder: its sub-folders and files, each sorted
/// by name. Nested entries are not included.
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DirListing {
    pub folders: Vec<FolderEntry>,
    pub files: Vec<FileEntry>,
}
