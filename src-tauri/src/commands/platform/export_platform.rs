use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn export_platform(
    state: State<'_, AppState>,
    platform_id: String,
) -> Result<bool, String> {
    crate::logging::logged(
        "export_platform",
        crate::service::export_platform(&state, platform_id).await,
    )
}
