use std::collections::BTreeMap;

use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct EnvironmentAuthDTO {
    pub id: String,
    #[serde(rename = "environmentId")]
    pub environment_id: String,
    pub url: String,
    pub method: String,
    pub body: String,
    #[serde(rename = "tokenPath")]
    pub token_path: String,
    #[serde(rename = "tokenPlacement")]
    pub token_placement: String,
    /// How the token reaches a WebSocket handshake: `query` (default), `header`
    /// or `cookie`. Separate from `token_placement` because a server that reads
    /// the token from an HTTP header often can't read one on the upgrade.
    #[serde(rename = "wsTokenPlacement")]
    pub ws_token_placement: String,
    #[serde(rename = "accessToken")]
    pub access_token: Option<String>,
    /// Куки сессии, пришедшие в `Set-Cookie` ответа авторизации. Пишутся только
    /// авторизацией, руками не редактируются — поэтому их нет в
    /// [`UpdateEnvironmentAuthDTO`].
    #[serde(rename = "authCookies")]
    pub auth_cookies: BTreeMap<String, String>,
    /// Хост, выдавший `auth_cookies`; дальше них куки не уходят.
    #[serde(rename = "authCookieHost")]
    pub auth_cookie_host: String,
}

#[derive(Debug, Deserialize)]
pub struct UpdateEnvironmentAuthDTO {
    #[serde(rename = "environmentId")]
    pub environment_id: String,
    pub url: String,
    pub method: String,
    pub body: String,
    #[serde(rename = "tokenPath")]
    pub token_path: String,
    #[serde(rename = "tokenPlacement")]
    pub token_placement: String,
    #[serde(rename = "wsTokenPlacement")]
    pub ws_token_placement: String,
}
