use std::collections::BTreeMap;

use crate::domain::environment::environment_auth::repository;
use crate::state::AppState;
use tauri::State;

/// Сбрасывает авторизацию окружения целиком: и токен, и куки сессии.
///
/// Именно вместе — иначе «очистить токен» оставляло бы рабочую сессию в куках,
/// и запросы продолжали бы уходить авторизованными.
#[tauri::command]
pub async fn clear_environment_session(
    state: State<'_, AppState>,
    environment_id: String,
) -> Result<(), String> {
    repository::set_access_token(&state.db, &environment_id, None).await?;
    repository::set_auth_cookies(&state.db, &environment_id, &BTreeMap::new(), "").await
}
