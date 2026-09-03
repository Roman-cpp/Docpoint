use crate::domain::environment::environment_auth::dto::EnvironmentAuthDTO;
use crate::domain::environment::environment_proxy::repository as proxy_repository;
use crate::service::env_auth::token;
use crate::state::AppState;
use tauri::State;

/// Выполняет запрос авторизации окружения и сохраняет всё, что тот выдал: токен
/// из тела по `token_path` и куки из `Set-Cookie`.
///
/// Возвращает обновлённую строку авторизации, чтобы фронт показал актуальные
/// токен и куки. `None` — сервер не дал ни того, ни другого (или запрос
/// авторизации не настроен).
#[tauri::command]
pub async fn authenticate_environment(
    state: State<'_, AppState>,
    environment_id: String,
) -> Result<Option<EnvironmentAuthDTO>, String> {
    crate::logging::logged(
        "authenticate_environment",
        async {
            // Через прокси окружения, если он задан: сервер авторизации обычно живёт
            // за тем же периметром, что и API.
            let proxy = proxy_repository::read_config(&state.db, &environment_id).await?;
            let client = state.http_clients.get(proxy.as_ref())?;
            token::authenticate(&client, &state.db, &environment_id).await
        }
        .await,
    )
}
