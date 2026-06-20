use crate::domain::platform::dto::UpdatePlatformDTO;
use crate::domain::platform::repository::PlatformRepository;
use crate::repository::sqlite::platform::PlatformRepo;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn update_platform(
    state: State<'_, AppState>,
    platform: UpdatePlatformDTO,
) -> Result<(), String> {
    PlatformRepo::new(&state.db).update(&platform).await
}
