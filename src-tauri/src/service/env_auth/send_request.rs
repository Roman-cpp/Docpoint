use crate::domain::environment::environment_auth::repository;
use crate::infrastructure::http_client::{self, RequestPayload, ResponsePayload};
use crate::service::env_auth::{cookies, token};
use crate::state::AppState;
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

    let auth = match &env_id {
        Some(env_id) => repository::read_by_env_id(&state.db, env_id).await?,
        None => None,
    };

    // Авторизацию, которую пользователь задал сам, мы не трогаем и не обновляем
    // при 401: она не наша. В куковом режиме это только его версия одной из
    // наших кук — посторонний `Cookie` сессию окружения не отменяет.
    let had_explicit_auth = match &auth {
        Some(auth) if auth.token_placement == "cookie" => {
            cookies::user_overrides(&payload.headers, &auth.auth_cookies)
        }
        _ => payload
            .headers
            .keys()
            .any(|k| k.eq_ignore_ascii_case("authorization")),
    };

    // Заголовки до подстановки: повтор после обновления авторизации собирается
    // от них, иначе старые куки в `Cookie` победили бы свежие как «свои».
    let original_headers = payload.headers.clone();
    if !had_explicit_auth {
        if let Some(auth) = &auth {
            let url = payload.url().to_string();
            token::apply_http(&mut payload.headers, auth, &url);
        }
    }

    let response = http_client::send(&state.http_client, payload.clone()).await?;

    // If unauthorized and the token was managed by us, refresh it and retry once.
    if response.status == 401 && !had_explicit_auth {
        if let Some(env_id) = &env_id {
            if let Some(fresh) = token::authenticate(&state.http_client, &state.db, env_id).await? {
                let url = payload.url().to_string();
                payload.headers = original_headers;
                token::apply_http(&mut payload.headers, &fresh, &url);
                return http_client::send(&state.http_client, payload).await;
            }
        }
    }

    Ok(response)
}
