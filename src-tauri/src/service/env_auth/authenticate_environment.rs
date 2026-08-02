use crate::domain::environment::environment_auth::dto::EnvironmentAuthDTO;
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
    token::authenticate(&state.http_client, &state.db, &environment_id).await
}
