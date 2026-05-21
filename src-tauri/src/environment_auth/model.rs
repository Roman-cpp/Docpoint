use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct EnvironmentAuth {
    pub id: String,
    #[serde(rename = "environmentId")]
    pub environment_id: String,
    pub url: String,
    pub method: String,
    pub body: String,
    #[serde(rename = "tokenPath")]
    pub token_path: String,
    #[serde(rename = "accessToken")]
    pub access_token: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateEnvironmentAuth {
    #[serde(rename = "environmentId")]
    pub environment_id: String,
    pub url: String,
    pub method: String,
    pub body: String,
    #[serde(rename = "tokenPath")]
    pub token_path: String,
}
