use std::collections::HashMap;

use tauri::AppHandle;

use crate::domain::environment::environment_auth::dto::EnvironmentAuthDTO;
use crate::domain::environment::environment_auth::repository;
use crate::domain::environment::environment_proxy::repository as proxy_repository;
use crate::infrastructure::ws_client;
use crate::service::environment::environment_auth::{apply, token};
use crate::state::AppState;

/// Opens a WebSocket connection to `url` from the backend and streams every
/// incoming frame to the frontend over the event channel `ws://{id}`.
///
/// The caller may supply `id` so it can register its event listener *before*
/// connecting and never miss the initial `Open`/first frames; when omitted a
/// fresh uuid is generated. The returned id is the event-channel suffix and the
/// handle for [`ws_send`](super::ws_send) / [`ws_disconnect`](super::ws_disconnect).
///
/// Auth works exactly like [`send_request`](crate::service::request::send_request):
/// the selected environment's credentials are attached automatically unless the
/// caller provided their own, and a handshake rejected with 401/403 triggers a
/// re-auth plus one retry. What exactly is attached is decided the same way as
/// for HTTP (see [`apply::compute`]), using `ws_token_placement` instead of
/// `token_placement` — by default the token as a `token` query parameter (many
/// WS servers can't read handshake headers), optionally `Authorization:
/// Bearer`/custom header or the environment's session cookies.
pub async fn ws_connect(
    app: AppHandle,
    state: &AppState,
    url: String,
    headers: Option<HashMap<String, String>>,
    id: Option<String>,
) -> Result<String, String> {
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
        .map(|auth| apply::had_explicit_auth(auth, &auth.ws_token_placement, &url, &base_headers))
        .unwrap_or(false);

    let (target_url, target_headers) = match (&auth, had_explicit_auth) {
        (Some(auth), false) => build_target(&url, &base_headers, auth),
        _ => (url.clone(), base_headers.clone()),
    };

    let id = id.unwrap_or_else(|| uuid::Uuid::new_v4().to_string());
    let conn =
        match ws_client::connect(app.clone(), id.clone(), target_url, Some(target_headers)).await {
            Ok(conn) => conn,
            Err(err) => {
                let expired = matches!(err.status, Some(401) | Some(403)) && !had_explicit_auth;
                let refreshed = match (expired, &env_id) {
                    (true, Some(env_id)) => {
                        // Запрос авторизации — обычный HTTP, поэтому уходит через
                        // прокси окружения (insecure/timeout читаются независимо
                        // от того, включён ли прокси — см. `ClientPool::get`).
                        // Само рукопожатие WebSocket прокси не знает и идёт напрямую.
                        let proxy_row = proxy_repository::ensure_row(&state.db, env_id).await?;
                        let client = state
                            .http_clients
                            .get(proxy_row.to_config().as_ref(), proxy_row.insecure)?;
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

/// Прикладывает авторизацию окружения к копии цели подключения — тонкая
/// обёртка над [`apply::compute`] с `ws_token_placement` вместо
/// `token_placement`.
fn build_target(
    url: &str,
    headers: &HashMap<String, String>,
    auth: &EnvironmentAuthDTO,
) -> (String, HashMap<String, String>) {
    apply::compute(auth, &auth.ws_token_placement, url, headers)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn auth(ws_token_placement: &str, token: &str) -> EnvironmentAuthDTO {
        EnvironmentAuthDTO {
            id: "a".to_string(),
            environment_id: "e".to_string(),
            auth_type: "token".to_string(),
            basic_username: String::new(),
            basic_password: String::new(),
            token_source: "login".to_string(),
            credential_name: "Authorization".to_string(),
            scheme: "Bearer".to_string(),
            url: "https://x/login".to_string(),
            method: "POST".to_string(),
            body: String::new(),
            body_content_type: "json".to_string(),
            extra_headers: Default::default(),
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
        assert_eq!(url, "wss://x/ws?Authorization=a%2Fb%2Bc%3D");
        assert!(headers.is_empty());
    }

    #[test]
    fn query_placement_keeps_existing_query_string() {
        let (url, _) = build_target("wss://x/ws?v=1", &HashMap::new(), &auth("query", "t"));
        assert_eq!(url, "wss://x/ws?v=1&Authorization=t");
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
        assert_eq!(url, "wss://x/ws?Authorization=t");
    }

    #[test]
    fn callers_own_token_wins() {
        let empty = HashMap::new();
        assert!(apply::had_explicit_auth(
            &auth("query", "t"),
            "query",
            "wss://x/ws?Authorization=mine",
            &empty
        ));
        assert!(!apply::had_explicit_auth(
            &auth("query", "t"),
            "query",
            "wss://x/ws?tokenish=mine",
            &empty
        ));

        let mut bearer = HashMap::new();
        bearer.insert("authorization".to_string(), "Bearer mine".to_string());
        assert!(apply::had_explicit_auth(
            &auth("header", "t"),
            "header",
            "wss://x/ws",
            &bearer
        ));
        assert!(!apply::had_explicit_auth(
            &auth("cookie", "t"),
            "cookie",
            "wss://x/ws",
            &bearer
        ));
    }

    /// Регрессия: посторонняя кука не должна отменять сессию окружения — раньше
    /// любой `Cookie` в запросе выключал подстановку целиком.
    #[test]
    fn unrelated_cookie_no_longer_disables_our_session() {
        let mut base = HashMap::new();
        base.insert("Cookie".to_string(), "theme=dark".to_string());
        assert!(!apply::had_explicit_auth(
            &auth("cookie", ""),
            "cookie",
            "wss://x/ws",
            &base
        ));

        let mut own = HashMap::new();
        own.insert("Cookie".to_string(), "session_id=mine".to_string());
        assert!(apply::had_explicit_auth(
            &auth("cookie", ""),
            "cookie",
            "wss://x/ws",
            &own
        ));
    }
}
