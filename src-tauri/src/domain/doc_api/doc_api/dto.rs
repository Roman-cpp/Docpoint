use serde::Deserialize;

#[derive(Debug, Deserialize)]
pub struct CreateDocApiDTO {
    pub name: String,
    pub version: String,
    pub desc: String,
    /// Optional in import files: docs written before prefixes existed have none.
    #[serde(default)]
    pub prefix: String,
    pub tags: Vec<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateDocApiDTO {
    pub id: String,
    pub name: String,
    pub desc: String,
    #[serde(default)]
    pub prefix: String,
    pub tags: Vec<String>,
}
