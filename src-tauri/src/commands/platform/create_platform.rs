use crate::domain::platform::dto::CreatePlatformDTO;
use crate::domain::platform::entity::Platform;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn create_platform(
    state: State<'_, AppState>,
    platform: CreatePlatformDTO,
) -> Result<Platform, String> {
    crate::logging::logged(
        "create_platform",
        crate::service::create_platform(&state, platform).await,
    )
}
