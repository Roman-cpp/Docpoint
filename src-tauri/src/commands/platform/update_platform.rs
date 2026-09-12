use crate::domain::platform::dto::UpdatePlatformDTO;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn update_platform(
    state: State<'_, AppState>,
    platform: UpdatePlatformDTO,
) -> Result<(), String> {
    crate::logging::logged(
        "update_platform",
        crate::service::update_platform(&state, platform).await,
    )
}
