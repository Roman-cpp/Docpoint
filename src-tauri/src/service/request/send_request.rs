use std::time::Duration;

use crate::domain::environment::environment_auth::repository;
use crate::domain::environment::environment_proxy::repository as proxy_repository;
use crate::infrastructure::http_client::{self, RequestPayload, ResponsePayload};
use crate::service::environment::environment_auth::{apply, token};
use crate::state::AppState;

pub async fn send_request(
    state: &AppState,
    mut payload: RequestPayload,
) -> Result<ResponsePayload, String> {
    let env_id = state
        .selected_environment_id
        .lock()
        .map_err(|e| e.to_string())?
        .clone();

    let auth = match &env_id {
        Some(env_id) => repository::read_by_env_id(&state.db, env_id).await?,
        None => None,
    };

    // Прокси/таймаут/insecure берём у того же окружения: через них уходит и
    // сам запрос, и запрос авторизации при повторе — иначе половина обмена
    // шла бы мимо, или таймаут действовал бы не на все запросы окружения.
    let proxy_row = match &env_id {
        Some(env_id) => Some(proxy_repository::ensure_row(&state.db, env_id).await?),
        None => None,
    };
    let proxy_cfg = proxy_row.as_ref().and_then(|p| p.to_config());
    let insecure = proxy_row.as_ref().map(|p| p.insecure).unwrap_or(false);
    let timeout = proxy_row
        .as_ref()
        .filter(|p| p.timeout_ms > 0)
        .map(|p| Duration::from_millis(p.timeout_ms));
    let client = state.http_clients.get(proxy_cfg.as_ref(), insecure)?;

    // Авторизацию, которую пользователь задал сам, мы не трогаем и не обновляем
    // при 401: она не наша.
    let had_explicit_auth = match &auth {
        Some(auth) => {
            apply::had_explicit_auth(auth, &auth.token_placement, payload.url(), &payload.headers)
        }
        None => false,
    };

    // Заголовки и url до подстановки: повтор после обновления авторизации
    // собирается от них, иначе старые куки/query-параметр победили бы
    // свежие как «свои».
    let original_headers = payload.headers.clone();
    let original_url = payload.url().to_string();
    if !had_explicit_auth {
        if let Some(auth) = &auth {
            let (url, headers) =
                apply::compute(auth, &auth.token_placement, payload.url(), &payload.headers);
            payload.set_url(url);
            payload.headers = headers;
        }
    }

    let response = http_client::send(&client, payload.clone(), timeout).await?;

    // If unauthorized and the token was managed by us, refresh it and retry once.
    if response.status == 401 && !had_explicit_auth {
        if let Some(env_id) = &env_id {
            if let Some(fresh) = token::authenticate(&client, &state.db, env_id).await? {
                payload.set_url(original_url);
                payload.headers = original_headers;
                let (url, headers) = apply::compute(
                    &fresh,
                    &fresh.token_placement,
                    payload.url(),
                    &payload.headers,
                );
                payload.set_url(url);
                payload.headers = headers;
                return http_client::send(&client, payload, timeout).await;
            }
        }
    }

    Ok(response)
}
