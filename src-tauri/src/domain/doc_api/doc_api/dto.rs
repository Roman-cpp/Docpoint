use serde::Deserialize;

#[derive(Debug, Deserialize)]
pub struct CreateDocApiDTO {
    pub name: String,
    pub version: String,
    pub desc: String,
    pub tags: Vec<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateDocApiDTO {
    pub id: String,
    pub name: String,
    pub desc: String,
    pub tags: Vec<String>,
}
