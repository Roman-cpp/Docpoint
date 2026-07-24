use serde::Serialize;

/// A file inside a scope, as shown in the file browser.
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct VaultFile {
    /// Path relative to the scope root, `/`-separated.
    pub path: String,
    pub name: String,
    /// Size on disk in bytes. Format for display on the frontend.
    pub size: u64,
    /// Last modification time, unix seconds. Format for display on the frontend.
    pub updated: i64,
}

/// A sub-folder inside a scope, as shown in the file browser.
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct VaultFolder {
    /// Path relative to the scope root, `/`-separated.
    pub path: String,
    pub name: String,
    pub children_count: u64,
}

/// Direct contents of a single folder, each list sorted by name. Nested entries
/// are not included.
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DirListing {
    pub folders: Vec<VaultFolder>,
    pub files: Vec<VaultFile>,
}

/// A markdown file with its body loaded.
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MarkdownFile {
    /// Path relative to the scope root, `/`-separated.
    pub path: String,
    pub name: String,
    pub content: String,
    pub size: u64,
    pub updated: i64,
}
