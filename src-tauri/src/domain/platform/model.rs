use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct Platform {
    pub id: String,
    pub name: String,
    pub desc: String,
}

#[derive(Debug, Deserialize)]
pub struct CreatePlatformDTO {
    pub name: String,
    pub desc: String,
}

#[derive(Debug, Deserialize)]
pub struct UpdatePlatformDTO {
    pub id: String,
    pub name: String,
    pub desc: String,
}
