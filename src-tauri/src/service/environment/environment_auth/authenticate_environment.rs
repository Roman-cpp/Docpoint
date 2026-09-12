use crate::domain::environment::environment_auth::dto::EnvironmentAuthDTO;
use crate::domain::environment::environment_proxy::repository as proxy_repository;
use crate::service::environment::environment_auth::token;
use crate::state::AppState;

/// Выполняет запрос авторизации окружения и сохраняет всё, что тот выдал: токен
/// из тела по `token_path` и куки из `Set-Cookie`.
///
/// Возвращает обновлённую строку авторизации, чтобы фронт показал актуальные
/// токен и куки. `None` — сервер не дал ни того, ни другого (или запрос
/// авторизации не настроен).
pub async fn authenticate_environment(
    state: &AppState,
    environment_id: String,
) -> Result<Option<EnvironmentAuthDTO>, String> {
    // Через прокси окружения, если он задан: сервер авторизации обычно живёт
    // за тем же периметром, что и API. `insecure` теперь читается независимо
    // от того, включён ли прокси — см. `ClientPool::get`.
    let proxy_row = proxy_repository::ensure_row(&state.db, &environment_id).await?;
    let client = state
        .http_clients
        .get(proxy_row.to_config().as_ref(), proxy_row.insecure)?;
    token::authenticate(&client, &state.db, &environment_id).await
}
