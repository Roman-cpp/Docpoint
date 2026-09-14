//! Единая точка применения авторизации окружения к запросу — общая для
//! HTTP ([`send_request`](super::send_request)) и WebSocket-рукопожатия
//! ([`ws_connect`](crate::service::websocket::ws_connect)). Раньше у каждого
//! транспорта была своя копия этой логики (`token::apply_http` и
//! `connect::build_target`), и любое новое поведение (Basic Auth, свои
//! имя/префикс заголовка, query-placement) пришлось бы вносить дважды.
//!
//! `placement` — это `token_placement` для HTTP или `ws_token_placement` для
//! WS: это единственное, что различается между вызовами, поэтому передаётся
//! отдельным параметром, а не читается из `auth` напрямую.

use std::collections::HashMap;

use super::cookies::{self, CookieJar};
use crate::domain::environment::environment_auth::dto::EnvironmentAuthDTO;

/// Считает итоговые `(url, headers)` запроса с применённой авторизацией
/// окружения. `auth_type = "none"` не трогает ничего; `"basic"` кладёт
/// `Authorization: Basic …` независимо от `placement`; `"token"` подставляет
/// `access_token` по `placement` с именем `credential_name` и (для заголовка)
/// префиксом `scheme`.
pub fn compute(
    auth: &EnvironmentAuthDTO,
    placement: &str,
    url: &str,
    headers: &HashMap<String, String>,
) -> (String, HashMap<String, String>) {
    let mut headers = headers.clone();

    match auth.auth_type.as_str() {
        "none" => return (url.to_string(), headers),
        "basic" => {
            if !auth.basic_username.is_empty() || !auth.basic_password.is_empty() {
                let credentials = base64_encode(
                    format!("{}:{}", auth.basic_username, auth.basic_password).as_bytes(),
                );
                set_header(
                    &mut headers,
                    "Authorization",
                    &format!("Basic {credentials}"),
                );
            }
            return (url.to_string(), headers);
        }
        _ => {}
    }

    // auth_type == "token" отсюда и до конца функции.
    match placement {
        "cookie" => {
            if auth.token_source == "login" {
                // Логин прислал произвольный набор кук в Set-Cookie — реплеим
                // его целиком, `credential_name`/`scheme` тут ни при чём.
                if cookies::host_matches(url, &auth.auth_cookie_host) {
                    cookies::apply(&mut headers, &auth.auth_cookies);
                }
            } else if let Some(token) = access_token(auth) {
                // Статическое значение — одна именованная кука.
                let mut jar = CookieJar::new();
                jar.insert(auth.credential_name.clone(), token.to_string());
                cookies::apply(&mut headers, &jar);
            }
        }
        "header" => {
            if let Some(token) = access_token(auth) {
                let scheme = auth.scheme.trim();
                let value = if scheme.is_empty() {
                    token.to_string()
                } else {
                    format!("{scheme} {token}")
                };
                set_header(&mut headers, &auth.credential_name, &value);
            }
        }
        _ => {
            // query
            if let Some(token) = access_token(auth) {
                let sep = if url.contains('?') { '&' } else { '?' };
                let new_url = format!(
                    "{url}{sep}{}={}",
                    auth.credential_name,
                    encode_query_value(token)
                );
                return (new_url, headers);
            }
        }
    }

    (url.to_string(), headers)
}

fn access_token(auth: &EnvironmentAuthDTO) -> Option<&str> {
    auth.access_token.as_deref().filter(|t| !t.is_empty())
}

/// Принёс ли вызывающий свою версию авторизации для этого запроса — тогда мы
/// её не трогаем и не обновляем при 401 (не наша).
///
/// Для куки работает только одноимённое перекрытие (см.
/// [`cookies::user_overrides`]): посторонняя кука вроде `theme=dark` не должна
/// гасить сессию окружения. Для заголовка/query — по имени `credential_name`
/// (для Basic — фиксированно `Authorization`, как того требует схема).
pub fn had_explicit_auth(
    auth: &EnvironmentAuthDTO,
    placement: &str,
    url: &str,
    headers: &HashMap<String, String>,
) -> bool {
    match auth.auth_type.as_str() {
        "none" => false,
        "basic" => headers
            .keys()
            .any(|k| k.eq_ignore_ascii_case("authorization")),
        _ => match placement {
            "cookie" => cookies::user_overrides(headers, &cookie_jar_for(auth)),
            "header" => headers
                .keys()
                .any(|k| k.eq_ignore_ascii_case(&auth.credential_name)),
            _ => url_has_query_param(url, &auth.credential_name),
        },
    }
}

fn cookie_jar_for(auth: &EnvironmentAuthDTO) -> CookieJar {
    if auth.token_source == "login" {
        auth.auth_cookies.clone()
    } else if let Some(token) = access_token(auth) {
        let mut jar = CookieJar::new();
        jar.insert(auth.credential_name.clone(), token.to_string());
        jar
    } else {
        CookieJar::new()
    }
}

/// True if the URL's query string already has a parameter named `name`, so we
/// don't clobber a value the caller put there deliberately.
fn url_has_query_param(url: &str, name: &str) -> bool {
    let query = match url.split_once('?') {
        Some((_, q)) => q,
        None => return false,
    };
    query
        .split('&')
        .any(|pair| pair == name || pair.starts_with(&format!("{name}=")))
}

/// Ставит заголовок `name`, убрав прежнее значение с тем же именем без учёта
/// регистра — иначе при повторном запросе накопились бы дубли.
fn set_header(headers: &mut HashMap<String, String>, name: &str, value: &str) {
    headers.retain(|k, _| !k.eq_ignore_ascii_case(name));
    headers.insert(name.to_string(), value.to_string());
}

/// Percent-encodes a query-parameter value. Unreserved characters
/// (`A-Z a-z 0-9 - _ . ~`) pass through; everything else is `%`-escaped so
/// tokens containing `+`, `/`, `=` (standard base64) survive intact.
fn encode_query_value(value: &str) -> String {
    let mut out = String::with_capacity(value.len());
    for b in value.bytes() {
        match b {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => {
                out.push(b as char);
            }
            _ => out.push_str(&format!("%{b:02X}")),
        }
    }
    out
}

/// Стандартный base64 (с паддингом) для заголовка `Authorization: Basic`. Свой
/// маленький энкодер вместо внешней зависимости: алфавит фиксирован RFC 7617 и
/// нужен ровно в одном месте.
fn base64_encode(input: &[u8]) -> String {
    const ALPHABET: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut out = String::with_capacity(input.len().div_ceil(3) * 4);
    for chunk in input.chunks(3) {
        let b0 = chunk[0];
        let b1 = *chunk.get(1).unwrap_or(&0);
        let b2 = *chunk.get(2).unwrap_or(&0);
        let n = ((b0 as u32) << 16) | ((b1 as u32) << 8) | (b2 as u32);
        out.push(ALPHABET[((n >> 18) & 0x3F) as usize] as char);
        out.push(ALPHABET[((n >> 12) & 0x3F) as usize] as char);
        out.push(if chunk.len() > 1 {
            ALPHABET[((n >> 6) & 0x3F) as usize] as char
        } else {
            '='
        });
        out.push(if chunk.len() > 2 {
            ALPHABET[(n & 0x3F) as usize] as char
        } else {
            '='
        });
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    fn base(auth_type: &str) -> EnvironmentAuthDTO {
        EnvironmentAuthDTO {
            id: "a".to_string(),
            environment_id: "e".to_string(),
            auth_type: auth_type.to_string(),
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
            access_token: Some("t".to_string()),
            auth_cookies: [("sid".to_string(), "abc".to_string())]
                .into_iter()
                .collect(),
            auth_cookie_host: "api.example.com".to_string(),
        }
    }

    #[test]
    fn base64_matches_known_vector() {
        assert_eq!(base64_encode(b"user:pass"), "dXNlcjpwYXNz");
        assert_eq!(base64_encode(b""), "");
        assert_eq!(base64_encode(b"a"), "YQ==");
    }

    #[test]
    fn none_leaves_everything_untouched() {
        let (url, headers) = compute(&base("none"), "header", "https://x/y", &HashMap::new());
        assert_eq!(url, "https://x/y");
        assert!(headers.is_empty());
    }

    #[test]
    fn basic_sets_header_regardless_of_placement() {
        let mut auth = base("basic");
        auth.basic_username = "user".to_string();
        auth.basic_password = "pass".to_string();
        let (_, headers) = compute(&auth, "query", "https://x/y", &HashMap::new());
        assert_eq!(headers.get("Authorization").unwrap(), "Basic dXNlcjpwYXNz");
    }

    #[test]
    fn token_header_uses_custom_name_and_scheme() {
        let mut auth = base("token");
        auth.credential_name = "X-Api-Key".to_string();
        auth.scheme = String::new();
        let (url, headers) = compute(&auth, "header", "https://x/y", &HashMap::new());
        assert_eq!(url, "https://x/y");
        assert_eq!(headers.get("X-Api-Key").unwrap(), "t");
    }

    #[test]
    fn token_query_placement_appends_encoded_param() {
        let mut auth = base("token");
        auth.credential_name = "api_key".to_string();
        auth.access_token = Some("a/b+c=".to_string());
        let (url, headers) = compute(&auth, "query", "https://x/y", &HashMap::new());
        assert_eq!(url, "https://x/y?api_key=a%2Fb%2Bc%3D");
        assert!(headers.is_empty());
    }

    #[test]
    fn token_query_placement_keeps_existing_query_string() {
        let mut auth = base("token");
        auth.credential_name = "api_key".to_string();
        let (url, _) = compute(&auth, "query", "https://x/y?v=1", &HashMap::new());
        assert_eq!(url, "https://x/y?v=1&api_key=t");
    }

    #[test]
    fn token_cookie_login_replays_session_cookies() {
        let auth = base("token");
        let (_, headers) = compute(
            &auth,
            "cookie",
            "https://api.example.com/v1",
            &HashMap::new(),
        );
        assert_eq!(headers.get("Cookie").unwrap(), "sid=abc");
    }

    #[test]
    fn token_cookie_static_sends_single_named_cookie() {
        let mut auth = base("token");
        auth.token_source = "static".to_string();
        auth.credential_name = "session".to_string();
        auth.access_token = Some("xyz".to_string());
        let (_, headers) = compute(
            &auth,
            "cookie",
            "https://api.example.com/v1",
            &HashMap::new(),
        );
        assert_eq!(headers.get("Cookie").unwrap(), "session=xyz");
    }

    #[test]
    fn explicit_header_wins_and_disables_auto_refresh() {
        let auth = base("token");
        let mut headers = HashMap::new();
        headers.insert("authorization".to_string(), "Bearer mine".to_string());
        assert!(had_explicit_auth(&auth, "header", "https://x/y", &headers));
        assert!(!had_explicit_auth(
            &auth,
            "header",
            "https://x/y",
            &HashMap::new()
        ));
    }

    #[test]
    fn explicit_query_param_is_recognized_by_credential_name() {
        let mut auth = base("token");
        auth.credential_name = "api_key".to_string();
        assert!(had_explicit_auth(
            &auth,
            "query",
            "https://x/y?api_key=mine",
            &HashMap::new()
        ));
        assert!(!had_explicit_auth(
            &auth,
            "query",
            "https://x/y?other=1",
            &HashMap::new()
        ));
    }

    #[test]
    fn unrelated_cookie_does_not_count_as_explicit_auth() {
        let auth = base("token");
        let mut headers = HashMap::new();
        headers.insert("Cookie".to_string(), "theme=dark".to_string());
        assert!(!had_explicit_auth(&auth, "cookie", "https://x/y", &headers));
    }

    #[test]
    fn login_cookies_do_not_leak_to_another_host() {
        let auth = base("token");
        let (_, headers) = compute(&auth, "cookie", "https://evil.com/v1", &HashMap::new());
        assert!(headers.is_empty());
    }
}
