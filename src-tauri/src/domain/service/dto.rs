use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize, Serialize)]
pub struct CreateServiceDTO {
    pub name: String,
    pub desc: String,
    pub platform_id: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateServiceDTO {
    pub id: String,
    pub name: String,
    pub desc: String,
    pub platform_id: Option<String>,
}
