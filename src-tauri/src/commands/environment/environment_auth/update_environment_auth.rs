use crate::domain::environment::environment_auth::dto::UpdateEnvironmentAuthDTO;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn update_environment_auth(
    state: State<'_, AppState>,
    auth: UpdateEnvironmentAuthDTO,
) -> Result<(), String> {
    crate::logging::logged(
        "update_environment_auth",
        crate::service::update_environment_auth(&state, auth).await,
    )
}
