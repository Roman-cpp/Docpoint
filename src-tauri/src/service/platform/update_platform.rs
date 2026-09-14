use crate::domain::platform::dto::UpdatePlatformDTO;
use crate::domain::platform::repository::PlatformRepository;
use crate::repository::sqlite::platform::PlatformRepo;
use crate::state::AppState;

pub async fn update_platform(state: &AppState, platform: UpdatePlatformDTO) -> Result<(), String> {
    PlatformRepo::new(&state.db).update(&platform).await
}
