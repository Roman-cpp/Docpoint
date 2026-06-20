use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct DocApi {
    pub id: String,
    pub name: String,
    pub version: String,
    pub desc: String,
    pub tags: Vec<String>,
}
