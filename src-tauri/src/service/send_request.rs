use crate::domain::environment_auth::model::EnvironmentAuthDTO;
use crate::domain::environment_auth::repository;
use crate::infrastructure::http_client::{self, RequestPayload, ResponsePayload};
use crate::state::AppState;
use sqlx::SqlitePool;
use std::collections::HashMap;
use tauri::State;

#[tauri::command]
pub async fn send_request(
    state: State<'_, AppState>,
    mut payload: RequestPayload,
) -> Result<ResponsePayload, String> {
    let env_id = state
        .selected_environment_id
        .lock()
        .map_err(|e| e.to_string())?
        .clone();

    let had_explicit_auth = payload
        .headers
        .keys()
        .any(|k| k.eq_ignore_ascii_case("authorization"));

    if !had_explicit_auth {
        if let Some(env_id) = &env_id {
            if let Some(token) = repository::get_access_token(&state.db, env_id).await? {
                if !token.is_empty() {
                    set_auth_header(&mut payload.headers, &token);
                }
            }
        }
    }

    let response = http_client::send(payload.clone()).await?;

    // If unauthorized and the token was managed by us, refresh it and retry once.
    if response.status == 401 && !had_explicit_auth {
        if let Some(env_id) = &env_id {
            if let Some(token) = refresh_access_token(&state.db, env_id).await? {
                set_auth_header(&mut payload.headers, &token);
                return http_client::send(payload).await;
            }
        }
    }

    Ok(response)
}

fn set_auth_header(headers: &mut HashMap<String, String>, token: &str) {
    headers.retain(|k, _| !k.eq_ignore_ascii_case("authorization"));
    headers.insert("Authorization".to_string(), format!("Bearer {token}"));
}

/// Runs the auth request configured in `environment_auth`, extracts the token
/// from the response body via `token_path`, persists it, and returns it.
async fn refresh_access_token(
    db: &SqlitePool,
    environment_id: &str,
) -> Result<Option<String>, String> {
    let auth = match repository::read_by_env_id(db, environment_id).await? {
        Some(auth) if !auth.url.is_empty() => auth,
        _ => return Ok(None),
    };

    let response = http_client::send(build_auth_request(&auth)).await?;
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

    Ok(token)
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
/// (e.g. "data.access_token"). An empty path returns the whole body trimmed.
fn extract_token(body: &str, token_path: &str) -> Option<String> {
    let path = token_path.trim();
    if path.is_empty() {
        let trimmed = body.trim();
        return (!trimmed.is_empty()).then(|| trimmed.to_string());
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
