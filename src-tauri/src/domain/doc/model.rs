use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct Doca {
    pub id: String,
    pub name: String,
    pub version: String,
    pub desc: String,
    pub tags: Vec<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateDocDTO {
    pub name: String,
    pub version: String,
    pub desc: String,
    pub tags: Vec<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateDocDTO {
    pub id: String,
    pub name: String,
    pub desc: String,
    pub tags: Vec<String>,
}
