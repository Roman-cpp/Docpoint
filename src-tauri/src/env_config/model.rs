use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct EnvConfig {
    pub id: String,
    pub env: String,
    pub label: String,
    #[serde(rename = "baseUrl")]
    pub base_url: String,
    pub value: Vec<EnvValue>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct EnvValue {
    pub value: String,
    pub name: String,
}
