use std::collections::BTreeMap;

use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct EnvironmentAuthDTO {
    pub id: String,
    #[serde(rename = "environmentId")]
    pub environment_id: String,
    /// Верхний переключатель: `none` — ничего не подставлять, `basic` —
    /// `Authorization: Basic` на каждый запрос и WS-рукопожатие, `token` —
    /// заголовок/query/кука с токеном (см. `token_source`).
    #[serde(rename = "authType")]
    pub auth_type: String,
    #[serde(rename = "basicUsername")]
    pub basic_username: String,
    #[serde(rename = "basicPassword")]
    pub basic_password: String,
    /// При `auth_type = "token"`: `static` — значение введено вручную (лежит в
    /// `access_token`, как и обычный вручную заданный токен), `login` —
    /// добывается запросом авторизации ниже.
    #[serde(rename = "tokenSource")]
    pub token_source: String,
    /// Имя заголовка/query-параметра/куки для токена. Раньше было захардкожено
    /// как `Authorization`.
    #[serde(rename = "credentialName")]
    pub credential_name: String,
    /// Префикс значения при `token_placement = "header"` (`Bearer`, `Token`,
    /// пусто…). Раньше был захардкожен как `Bearer `.
    pub scheme: String,
    pub url: String,
    pub method: String,
    pub body: String,
    /// Content-Type тела логин-запроса: `json` или `form`
    /// (`application/x-www-form-urlencoded`).
    #[serde(rename = "bodyContentType")]
    pub body_content_type: String,
    /// Доп. статические заголовки логин-запроса (тот же формат хранения, что у
    /// `auth_cookies`).
    #[serde(rename = "extraHeaders")]
    pub extra_headers: BTreeMap<String, String>,
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
    #[serde(rename = "authType")]
    pub auth_type: String,
    #[serde(rename = "basicUsername")]
    pub basic_username: String,
    #[serde(rename = "basicPassword")]
    pub basic_password: String,
    #[serde(rename = "tokenSource")]
    pub token_source: String,
    #[serde(rename = "credentialName")]
    pub credential_name: String,
    pub scheme: String,
    pub url: String,
    pub method: String,
    pub body: String,
    #[serde(rename = "bodyContentType")]
    pub body_content_type: String,
    #[serde(rename = "extraHeaders")]
    pub extra_headers: BTreeMap<String, String>,
    #[serde(rename = "tokenPath")]
    pub token_path: String,
    #[serde(rename = "tokenPlacement")]
    pub token_placement: String,
    #[serde(rename = "wsTokenPlacement")]
    pub ws_token_placement: String,
}
