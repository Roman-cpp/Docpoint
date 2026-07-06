use std::collections::HashMap;

use tauri::{AppHandle, State};

use crate::domain::environment::environment_auth::repository;
use crate::infrastructure::ws_client;
use crate::state::AppState;

/// Opens a WebSocket connection to `url` from the backend and streams every
/// incoming frame to the frontend over the event channel `ws://{id}`.
///
/// The caller may supply `id` so it can register its event listener *before*
/// connecting and never miss the initial `Open`/first frames; when omitted a
/// fresh uuid is generated. The returned id is the event-channel suffix and the
/// handle for [`ws_send`](super::ws_send) / [`ws_disconnect`](super::ws_disconnect).
///
/// Just like [`send_request`](crate::service::env_auth::send_request), the
/// selected environment's access token is attached automatically — unless the
/// caller already provided one. Unlike the HTTP client, the token is appended to
/// the URL as a `token` query parameter (many WS servers can't read the
/// handshake `Authorization` header), and only when the URL doesn't already
/// carry a `token=` param.
#[tauri::command]
pub async fn ws_connect(
    app: AppHandle,
    state: State<'_, AppState>,
    url: String,
    headers: Option<HashMap<String, String>>,
    id: Option<String>,
) -> Result<String, String> {
    let headers = headers.unwrap_or_default();

    let mut url = url;
    if !url_has_token_param(&url) {
        let env_id = state
            .selected_environment_id
            .lock()
            .map_err(|e| e.to_string())?
            .clone();

        if let Some(env_id) = &env_id {
            if let Some(token) = repository::get_access_token(&state.db, env_id).await? {
                if !token.is_empty() {
                    let sep = if url.contains('?') { '&' } else { '?' };
                    url = format!("{url}{sep}token={}", encode_query_value(&token));
                }
            }
        }
    }

    let id = id.unwrap_or_else(|| uuid::Uuid::new_v4().to_string());
    let conn = ws_client::connect(app, id.clone(), url, Some(headers)).await?;
    state.ws_conns.insert(id.clone(), conn);
    Ok(id)
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
