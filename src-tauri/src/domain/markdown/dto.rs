use serde::Deserialize;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateMarkdownDTO {
    /// Target directory inside the vault. Empty string writes to the root.
    pub folder: String,
    /// File name including the `.md` extension.
    pub name: String,
    pub content: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateMarkdownDTO {
    pub id: String,
    pub content: String,
}
