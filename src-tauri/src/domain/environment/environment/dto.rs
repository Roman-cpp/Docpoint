use serde::Deserialize;

#[derive(Debug, Deserialize)]
pub struct CreateEnvValueDTO {
    pub name: String,
    pub value: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateEnvironmentDTO {
    pub env: String,
    pub label: String,
    #[serde(rename = "baseUrl")]
    pub base_url: String,
    pub prefix: String,
}

#[derive(Debug, Deserialize)]
pub struct UpdateEnvironmentDTO {
    pub id: String,
    pub label: String,
    #[serde(rename = "baseUrl")]
    pub base_url: String,
    pub prefix: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateVariableDTO {
    pub name: String,
    pub value: String,
}

#[derive(Debug, Deserialize)]
pub struct UpdateVariableDTO {
    pub id: String,
    pub name: String,
    pub value: String,
}
