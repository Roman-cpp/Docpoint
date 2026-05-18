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
pub struct CreateDocInput {
    pub name: String,
    pub version: String,
    pub desc: String,
    pub tags: Vec<String>,
}
