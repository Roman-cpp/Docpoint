use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct Service {
    pub id: String,
    pub name: String,
    pub desc: String,
    pub platform_id: Option<String>,
}
