use std::collections::HashMap;

use tauri::{AppHandle, State};

use crate::domain::environment::environment_auth::dto::EnvironmentAuthDTO;
use crate::domain::environment::environment_auth::repository;
use crate::domain::environment::environment_proxy::repository as proxy_repository;
use crate::infrastructure::ws_client;
use crate::service::env_auth::{cookies, token};
use crate::state::AppState;

/// Opens a WebSocket connection to `url` from the backend and streams every
/// incoming frame to the frontend over the event channel `ws://{id}`.
///
/// The caller may supply `id` so it can register its event listener *before*
/// connecting and never miss the initial `Open`/first frames; when omitted a
/// fresh uuid is generated. The returned id is the event-channel suffix and the
/// handle for [`ws_send`](super::ws_send) / [`ws_disconnect`](super::ws_disconnect).
///
/// Auth works exactly like [`send_request`](crate::service::env_auth::send_request):
/// the selected environment's credentials are attached automatically unless the
/// caller provided their own, and a handshake rejected with 401/403 triggers a
/// re-auth plus one retry. What exactly is attached is `ws_token_placement` — by
/// default the token as a `token` query parameter (many WS servers can't read
/// handshake headers), optionally `Authorization: Bearer` or the environment's
/// session cookies.
#[tauri::command]
pub async fn ws_connect(
    app: AppHandle,
    state: State<'_, AppState>,
    url: String,
    headers: Option<HashMap<String, String>>,
    id: Option<String>,
) -> Result<String, String> {
    crate::logging::logged(
        "ws_connect",
        async {
            let base_headers = headers.unwrap_or_default();

            let env_id = state
                .selected_environment_id
                .lock()
                .map_err(|e| e.to_string())?
                .clone();
            let auth = match &env_id {
                Some(env_id) => repository::read_by_env_id(&state.db, env_id).await?,
                None => None,
            };

            // Авторизация, которую вызывающий задал сам, побеждает нашу и заодно
            // выключает обновление ниже: обновлять чужое нам нечем.
            let had_explicit_auth = auth
                .as_ref()
                .map(|auth| caller_brought_own_auth(&url, &base_headers, auth))
                .unwrap_or(false);

            let (target_url, target_headers) = match (&auth, had_explicit_auth) {
                (Some(auth), false) => build_target(&url, &base_headers, auth),
                _ => (url.clone(), base_headers.clone()),
            };

            let id = id.unwrap_or_else(|| uuid::Uuid::new_v4().to_string());
            let conn =
                match ws_client::connect(app.clone(), id.clone(), target_url, Some(target_headers))
                    .await
                {
                    Ok(conn) => conn,
                    Err(err) => {
                        let expired =
                            matches!(err.status, Some(401) | Some(403)) && !had_explicit_auth;
                        let refreshed = match (expired, &env_id) {
                            (true, Some(env_id)) => {
                                // Запрос авторизации — обычный HTTP, поэтому уходит через
                                // прокси окружения. Само рукопожатие WebSocket прокси не
                                // знает и идёт напрямую.
                                let proxy =
                                    proxy_repository::read_config(&state.db, env_id).await?;
                                let client = state.http_clients.get(proxy.as_ref())?;
                                token::authenticate(&client, &state.db, env_id).await?
                            }
                            _ => None,
                        };
                        let Some(fresh) = refreshed else {
                            return Err(err.message);
                        };

                        let (retry_url, retry_headers) = build_target(&url, &base_headers, &fresh);
                        ws_client::connect(app, id.clone(), retry_url, Some(retry_headers))
                            .await
                            .map_err(|e| e.message)?
                    }
                };

            state.ws_conns.insert(id.clone(), conn);
            Ok(id)
        }
        .await,
    )
}

/// Прикладывает авторизацию окружения к копии цели подключения так, как просит
/// `ws_token_placement`. Неизвестные значения падают обратно в query-параметр —
/// так эта команда работала до появления placement'ов.
fn build_target(
    url: &str,
    headers: &HashMap<String, String>,
    auth: &EnvironmentAuthDTO,
) -> (String, HashMap<String, String>) {
    let mut headers = headers.clone();
    match auth.ws_token_placement.as_str() {
        "cookie" => {
            if cookies::host_matches(url, &auth.auth_cookie_host) {
                cookies::apply(&mut headers, &auth.auth_cookies);
            }
        }
        "header" => {
            if let Some(t) = access_token(auth) {
                token::set_auth_header(&mut headers, t);
            }
        }
        _ => {
            if let Some(t) = access_token(auth) {
                let sep = if url.contains('?') { '&' } else { '?' };
                let url = format!("{url}{sep}token={}", encode_query_value(t));
                return (url, headers);
            }
        }
    }
    (url.to_string(), headers)
}

fn access_token(auth: &EnvironmentAuthDTO) -> Option<&str> {
    auth.access_token.as_deref().filter(|t| !t.is_empty())
}

/// Принёс ли вызывающий свою авторизацию для этого placement'а — тогда мы
/// оставляем его значение в покое (как `had_explicit_auth` в `send_request`).
fn caller_brought_own_auth(
    url: &str,
    headers: &HashMap<String, String>,
    auth: &EnvironmentAuthDTO,
) -> bool {
    match auth.ws_token_placement.as_str() {
        "cookie" => cookies::user_overrides(headers, &auth.auth_cookies),
        "header" => headers
            .keys()
            .any(|k| k.eq_ignore_ascii_case("authorization")),
        _ => url_has_token_param(url),
    }
}

/// True if the URL's query string already has a `token` parameter, so we don't
/// clobber a token the caller put there deliberately.
fn url_has_token_param(url: &str) -> bool {
    let query = match url.split_once('?') {
        Some((_, q)) => q,
        None => return false,
    };
    query
        .split('&')
        .any(|pair| pair == "token" || pair.starts_with("token="))
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

#[cfg(test)]
mod tests {
    use super::*;

    fn auth(ws_token_placement: &str, token: &str) -> EnvironmentAuthDTO {
        EnvironmentAuthDTO {
            id: "a".to_string(),
            environment_id: "e".to_string(),
            url: "https://x/login".to_string(),
            method: "POST".to_string(),
            body: String::new(),
            token_path: String::new(),
            token_placement: "header".to_string(),
            ws_token_placement: ws_token_placement.to_string(),
            access_token: (!token.is_empty()).then(|| token.to_string()),
            auth_cookies: [("session_id".to_string(), "fresh".to_string())]
                .into_iter()
                .collect(),
            auth_cookie_host: "x".to_string(),
        }
    }

    #[test]
    fn query_placement_appends_encoded_token() {
        let (url, headers) = build_target("wss://x/ws", &HashMap::new(), &auth("query", "a/b+c="));
        assert_eq!(url, "wss://x/ws?token=a%2Fb%2Bc%3D");
        assert!(headers.is_empty());
    }

    #[test]
    fn query_placement_keeps_existing_query_string() {
        let (url, _) = build_target("wss://x/ws?v=1", &HashMap::new(), &auth("query", "t"));
        assert_eq!(url, "wss://x/ws?v=1&token=t");
    }

    #[test]
    fn header_placement_sets_bearer_and_leaves_url_alone() {
        let (url, headers) = build_target("wss://x/ws", &HashMap::new(), &auth("header", "t"));
        assert_eq!(url, "wss://x/ws");
        assert_eq!(headers.get("Authorization").unwrap(), "Bearer t");
    }

    #[test]
    fn cookie_placement_sends_session_cookies_without_a_token() {
        let mut base = HashMap::new();
        base.insert("Cookie".to_string(), "theme=dark".to_string());

        let (url, headers) = build_target("wss://x/ws", &base, &auth("cookie", ""));

        assert_eq!(url, "wss://x/ws");
        let cookie = headers.get("Cookie").unwrap();
        assert!(cookie.contains("theme=dark"));
        assert!(cookie.contains("session_id=fresh"));
    }

    #[test]
    fn cookies_do_not_leak_to_another_host() {
        let (_, headers) = build_target("wss://evil.com/ws", &HashMap::new(), &auth("cookie", ""));
        assert!(headers.is_empty());
    }

    #[test]
    fn unknown_placement_falls_back_to_query() {
        let (url, _) = build_target("wss://x/ws", &HashMap::new(), &auth("nonsense", "t"));
        assert_eq!(url, "wss://x/ws?token=t");
    }

    #[test]
    fn callers_own_token_wins() {
        assert!(url_has_token_param("wss://x/ws?token=mine"));
        assert!(url_has_token_param("wss://x/ws?v=1&token=mine"));
        assert!(!url_has_token_param("wss://x/ws?tokenish=mine"));
        assert!(!url_has_token_param("wss://x/ws"));

        let empty = HashMap::new();
        assert!(caller_brought_own_auth(
            "wss://x/ws?token=mine",
            &empty,
            &auth("query", "t")
        ));

        let mut bearer = HashMap::new();
        bearer.insert("authorization".to_string(), "Bearer mine".to_string());
        assert!(caller_brought_own_auth(
            "wss://x/ws",
            &bearer,
            &auth("header", "t")
        ));
        assert!(!caller_brought_own_auth(
            "wss://x/ws",
            &bearer,
            &auth("cookie", "t")
        ));
    }

    /// Регрессия: посторонняя кука не должна отменять сессию окружения — раньше
    /// любой `Cookie` в запросе выключал подстановку целиком.
    #[test]
    fn unrelated_cookie_no_longer_disables_our_session() {
        let mut base = HashMap::new();
        base.insert("Cookie".to_string(), "theme=dark".to_string());
        assert!(!caller_brought_own_auth(
            "wss://x/ws",
            &base,
            &auth("cookie", "")
        ));

        let mut own = HashMap::new();
        own.insert("Cookie".to_string(), "session_id=mine".to_string());
        assert!(caller_brought_own_auth(
            "wss://x/ws",
            &own,
            &auth("cookie", "")
        ));
    }
}
