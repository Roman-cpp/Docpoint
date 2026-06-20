use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct Environment {
    pub id: String,
    pub env: String,
    pub label: String,
    #[serde(rename = "baseUrl")]
    pub base_url: String,
    pub prefix: String,
    pub value: Vec<EnvValue>,
    #[serde(rename = "accessToken")]
    pub access_token: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct EnvValue {
    pub id: String,
    pub name: String,
    pub value: String,
}
