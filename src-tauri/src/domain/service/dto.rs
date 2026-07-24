use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateServiceDTO {
    pub name: String,
    pub desc: String,
    pub platform_id: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateServiceDTO {
    pub id: String,
    pub name: String,
    pub desc: String,
    pub platform_id: String,
}
