use crate::domain::platform::model::UpdatePlatformDTO;
use crate::domain::platform::repository::{PlatformRepo, PlatformRepository};
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn update_platform(
    state: State<'_, AppState>,
    platform: UpdatePlatformDTO,
) -> Result<(), String> {
    PlatformRepo::new(&state.db).update(&platform).await
}
