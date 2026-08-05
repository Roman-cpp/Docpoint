use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateDomainDTO {
    pub name: String,
    pub desc: String,
    pub platform_id: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateDomainDTO {
    pub id: String,
    pub name: String,
    pub desc: String,
    pub platform_id: String,
}
