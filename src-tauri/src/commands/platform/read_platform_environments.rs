use crate::domain::environment::environment::entity::Environment;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn environments_by_platform(
    state: State<'_, AppState>,
    platform_id: String,
) -> Result<Vec<Environment>, String> {
    crate::logging::logged(
        "environments_by_platform",
        crate::service::environments_by_platform(&state, platform_id).await,
    )
}
