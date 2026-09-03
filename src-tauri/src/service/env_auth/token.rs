//! Применение и обновление авторизации окружения.
//!
//! Общий код для HTTP-пути ([`send_request`](super::send_request)) и
//! WebSocket-рукопожатия ([`ws_connect`](crate::service::websocket::ws_connect)):
//! оба подставляют авторизацию одинаково и оба умеют починиться после протухшей,
//! повторно выполнив запрос авторизации окружения.
//!
//! Что именно подставляется, решает `token_placement` / `ws_token_placement`:
//! токен в заголовке (`header`), токен в query (`query`, только WS) или куки
//! сессии (`cookie`) — см. [`cookies`](super::cookies).

use std::collections::HashMap;

use sqlx::SqlitePool;

use super::cookies;
use crate::domain::environment::environment_auth::dto::EnvironmentAuthDTO;
use crate::domain::environment::environment_auth::repository;
use crate::infrastructure::http_client::{self, RequestPayload};

/// Кладёт авторизацию окружения в заголовки запроса к `url`.
///
/// В режиме `cookie` уходят куки сессии, и только на выдавший их хост; иначе —
/// `Authorization: Bearer` с сохранённым токеном.
pub fn apply_http(headers: &mut HashMap<String, String>, auth: &EnvironmentAuthDTO, url: &str) {
    if auth.token_placement == "cookie" {
        if cookies::host_matches(url, &auth.auth_cookie_host) {
            cookies::apply(headers, &auth.auth_cookies);
        }
        return;
    }

    if let Some(token) = auth.access_token.as_deref().filter(|t| !t.is_empty()) {
        set_auth_header(headers, token);
    }
}

pub fn set_auth_header(headers: &mut HashMap<String, String>, token: &str) {
    headers.retain(|k, _| !k.eq_ignore_ascii_case("authorization"));
    headers.insert("Authorization".to_string(), format!("Bearer {token}"));
}

/// Выполняет запрос авторизации окружения: достаёт токен из тела по
/// `token_path`, забирает куки из `Set-Cookie` и сохраняет и то, и другое.
///
/// Возвращает перечитанную строку окружения — вызывающему остаётся применить её
/// через [`apply_http`] и повторить запрос. `Ok(None)` означает «повторять
/// нечего»: запрос авторизации не настроен или сервер не выдал ни токена, ни
/// кук.
pub async fn authenticate(
    client: &reqwest::Client,
    db: &SqlitePool,
    environment_id: &str,
) -> Result<Option<EnvironmentAuthDTO>, String> {
    let auth = match repository::read_by_env_id(db, environment_id).await? {
        Some(auth) if !auth.url.is_empty() => auth,
        _ => return Ok(None),
    };

    let response = http_client::send(client, build_auth_request(&auth)).await?;
    if response.status >= 300 {
        return Err(format!(
            "Token refresh failed: {} {}",
            response.status, response.status_text
        ));
    }

    let token = extract_token(&response.body, &auth.token_path);
    if let Some(token) = &token {
        repository::set_access_token(db, environment_id, Some(token)).await?;
    }

    if !response.set_cookies.is_empty() {
        // Куки мержатся в уже сохранённый набор: сервер часто обновляет одну
        // куку из нескольких, а остальные ждёт обратно нетронутыми.
        let mut jar = auth.auth_cookies.clone();
        cookies::merge_set_cookies(&mut jar, &response.set_cookies);
        let host = cookies::host_of(&auth.url).unwrap_or_default();
        repository::set_auth_cookies(db, environment_id, &jar, &host).await?;
    }

    if token.is_none() && response.set_cookies.is_empty() {
        return Ok(None);
    }

    repository::read_by_env_id(db, environment_id).await
}

fn build_auth_request(auth: &EnvironmentAuthDTO) -> RequestPayload {
    let mut headers = HashMap::new();
    headers.insert("Accept".to_string(), "application/json".to_string());

    let body = if auth.body.trim().is_empty() {
        None
    } else {
        headers.insert("Content-Type".to_string(), "application/json".to_string());
        Some(auth.body.clone())
    };

    let method = if auth.method.is_empty() {
        "POST".to_string()
    } else {
        auth.method.clone()
    };

    RequestPayload::new(method, auth.url.clone(), headers, body)
}

/// Extracts a token from a JSON body following a dotted `token_path`
/// (e.g. "data.access_token"). An empty path returns nothing: при куковой
/// авторизации токена в теле может не быть вовсе.
fn extract_token(body: &str, token_path: &str) -> Option<String> {
    let path = token_path.trim();
    if path.is_empty() {
        return None;
    }

    let value: serde_json::Value = serde_json::from_str(body).ok()?;
    let mut current = &value;
    for key in path.split('.').filter(|k| !k.is_empty()) {
        current = current.get(key)?;
    }

    match current {
        serde_json::Value::String(s) => Some(s.clone()),
        serde_json::Value::Null => None,
        other => Some(other.to_string()),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn auth(placement: &str) -> EnvironmentAuthDTO {
        EnvironmentAuthDTO {
            id: "a".to_string(),
            environment_id: "e".to_string(),
            url: "https://api.example.com/login".to_string(),
            method: "POST".to_string(),
            body: String::new(),
            token_path: String::new(),
            token_placement: placement.to_string(),
            ws_token_placement: "query".to_string(),
            access_token: Some("t".to_string()),
            auth_cookies: [("sid".to_string(), "abc".to_string())]
                .into_iter()
                .collect(),
            auth_cookie_host: "api.example.com".to_string(),
        }
    }

    #[test]
    fn header_placement_sends_bearer_and_no_cookies() {
        let mut headers = HashMap::new();
        apply_http(&mut headers, &auth("header"), "https://api.example.com/v1");
        assert_eq!(headers.get("Authorization").unwrap(), "Bearer t");
        assert!(!headers.contains_key("Cookie"));
    }

    #[test]
    fn cookie_placement_sends_session_cookies_and_no_bearer() {
        let mut headers = HashMap::new();
        apply_http(&mut headers, &auth("cookie"), "https://api.example.com/v1");
        assert_eq!(headers.get("Cookie").unwrap(), "sid=abc");
        assert!(!headers.contains_key("Authorization"));
    }

    #[test]
    fn cookies_do_not_leak_to_another_host() {
        let mut headers = HashMap::new();
        apply_http(&mut headers, &auth("cookie"), "https://evil.com/v1");
        assert!(headers.is_empty());
    }

    #[test]
    fn empty_token_path_yields_no_token() {
        assert_eq!(extract_token(r#"{"accessToken":"x"}"#, ""), None);
        assert_eq!(
            extract_token(r#"{"data":{"accessToken":"x"}}"#, "data.accessToken"),
            Some("x".to_string())
        );
    }
}
