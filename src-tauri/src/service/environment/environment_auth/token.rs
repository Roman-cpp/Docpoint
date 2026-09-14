//! Получение и обновление токена авторизации окружения через логин-запрос.
//!
//! Подстановка авторизации в сам запрос (HTTP/WS) живёт отдельно, в
//! [`apply`](super::apply) — она общая для обоих транспортов и не зависит от
//! того, как токен был получен (логином или введён вручную).

use std::collections::HashMap;

use sqlx::SqlitePool;

use super::cookies;
use crate::domain::environment::environment_auth::dto::EnvironmentAuthDTO;
use crate::domain::environment::environment_auth::repository;
use crate::infrastructure::http_client::{self, RequestPayload};

/// Выполняет запрос авторизации окружения: достаёт токен из тела по
/// `token_path`, забирает куки из `Set-Cookie` и сохраняет и то, и другое.
/// Не вызывается для `token_source = "static"` — там взять токен неоткуда,
/// кроме как из уже сохранённого значения.
///
/// Возвращает перечитанную строку окружения — вызывающему остаётся применить её
/// через [`apply::compute`](super::apply::compute) и повторить запрос.
/// `Ok(None)` означает «повторять нечего»: запрос авторизации не настроен,
/// токен статический, или сервер не выдал ни токена, ни кук.
pub async fn authenticate(
    client: &reqwest::Client,
    db: &SqlitePool,
    environment_id: &str,
) -> Result<Option<EnvironmentAuthDTO>, String> {
    let auth = match repository::read_by_env_id(db, environment_id).await? {
        Some(auth)
            if auth.auth_type == "token"
                && auth.token_source == "login"
                && !auth.url.is_empty() =>
        {
            auth
        }
        _ => return Ok(None),
    };

    let response = http_client::send(client, build_auth_request(&auth), None).await?;
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
        let content_type = if auth.body_content_type == "form" {
            "application/x-www-form-urlencoded"
        } else {
            "application/json"
        };
        headers.insert("Content-Type".to_string(), content_type.to_string());
        Some(auth.body.clone())
    };

    // Доп. заголовки идут после Accept/Content-Type, но не поверх них: если
    // пользователь сам задал Content-Type среди extra_headers, тело всё равно
    // должно уйти с тем content-type, что выбран в body_content_type.
    for (name, value) in &auth.extra_headers {
        if !headers.keys().any(|k| k.eq_ignore_ascii_case(name)) {
            headers.insert(name.clone(), value.clone());
        }
    }

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

    #[test]
    fn empty_token_path_yields_no_token() {
        assert_eq!(extract_token(r#"{"accessToken":"x"}"#, ""), None);
        assert_eq!(
            extract_token(r#"{"data":{"accessToken":"x"}}"#, "data.accessToken"),
            Some("x".to_string())
        );
    }

    fn base_auth() -> EnvironmentAuthDTO {
        EnvironmentAuthDTO {
            id: "a".to_string(),
            environment_id: "e".to_string(),
            auth_type: "token".to_string(),
            basic_username: String::new(),
            basic_password: String::new(),
            token_source: "login".to_string(),
            credential_name: "Authorization".to_string(),
            scheme: "Bearer".to_string(),
            url: "https://api.example.com/login".to_string(),
            method: "POST".to_string(),
            body: String::new(),
            body_content_type: "json".to_string(),
            extra_headers: Default::default(),
            token_path: String::new(),
            token_placement: "header".to_string(),
            ws_token_placement: "query".to_string(),
            access_token: None,
            auth_cookies: Default::default(),
            auth_cookie_host: String::new(),
        }
    }

    #[test]
    fn json_body_sets_json_content_type() {
        let mut auth = base_auth();
        auth.body = r#"{"login":"a"}"#.to_string();
        let payload = build_auth_request(&auth);
        assert_eq!(
            payload.headers.get("Content-Type").unwrap(),
            "application/json"
        );
    }

    #[test]
    fn form_body_sets_form_content_type() {
        let mut auth = base_auth();
        auth.body = "grant_type=password&username=a&password=b".to_string();
        auth.body_content_type = "form".to_string();
        let payload = build_auth_request(&auth);
        assert_eq!(
            payload.headers.get("Content-Type").unwrap(),
            "application/x-www-form-urlencoded"
        );
    }

    #[test]
    fn extra_headers_are_merged_without_overriding_content_type() {
        let mut auth = base_auth();
        auth.body = "{}".to_string();
        auth.extra_headers = [
            ("X-Client-Id".to_string(), "abc".to_string()),
            ("Content-Type".to_string(), "text/plain".to_string()),
        ]
        .into_iter()
        .collect();
        let payload = build_auth_request(&auth);
        assert_eq!(payload.headers.get("X-Client-Id").unwrap(), "abc");
        assert_eq!(
            payload.headers.get("Content-Type").unwrap(),
            "application/json"
        );
    }
}
