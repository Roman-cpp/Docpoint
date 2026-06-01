use crate::domain::platform::model::{CreatePlatformDTO, Platform};
use crate::domain::platform::repository::{PlatformRepo, PlatformRepository};
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn create_platform(
    state: State<'_, AppState>,
    platform: CreatePlatformDTO,
) -> Result<Platform, String> {
    PlatformRepo::new(&state.db).create(&platform).await
}
