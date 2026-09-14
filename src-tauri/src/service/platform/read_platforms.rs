use crate::domain::platform::entity::Platform;
use crate::domain::platform::repository::PlatformRepository;
use crate::repository::sqlite::platform::PlatformRepo;
use crate::state::AppState;

pub async fn read_platforms(state: &AppState) -> Result<Vec<Platform>, String> {
    PlatformRepo::new(&state.db).all().await
}
