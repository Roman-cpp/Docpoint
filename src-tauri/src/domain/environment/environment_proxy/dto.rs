use serde::{Deserialize, Serialize};

use super::entity::ProxyConfig;

#[derive(Debug, Serialize, Deserialize)]
pub struct EnvironmentProxyDTO {
    pub id: String,
    #[serde(rename = "environmentId")]
    pub environment_id: String,
    pub enabled: bool,
    pub url: String,
    pub username: String,
    pub password: String,
    pub bypass: String,
    pub insecure: bool,
}

impl EnvironmentProxyDTO {
    /// Настройка для клиента — или `None`, если прокси выключен либо адрес не
    /// задан. Выключенный прокси означает «идти напрямую», а не «идти в никуда».
    pub fn to_config(&self) -> Option<ProxyConfig> {
        if !self.enabled || self.url.trim().is_empty() {
            return None;
        }
        Some(ProxyConfig {
            url: self.url.trim().to_string(),
            username: self.username.clone(),
            password: self.password.clone(),
            bypass: self.bypass.trim().to_string(),
            insecure: self.insecure,
        })
    }
}

#[derive(Debug, Deserialize)]
pub struct UpdateEnvironmentProxyDTO {
    #[serde(rename = "environmentId")]
    pub environment_id: String,
    pub enabled: bool,
    pub url: String,
    pub username: String,
    pub password: String,
    pub bypass: String,
    pub insecure: bool,
}
