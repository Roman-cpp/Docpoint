use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct DocApi {
    pub id: String,
    pub name: String,
    pub version: String,
    pub desc: String,
    /// Appended after the environment prefix when a request URL is composed.
    pub prefix: String,
    pub tags: Vec<String>,
}
