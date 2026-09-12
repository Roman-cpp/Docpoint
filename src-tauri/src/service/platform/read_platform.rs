use crate::domain::platform::entity::Platform;
use crate::domain::platform::repository::PlatformRepository;
use crate::repository::sqlite::platform::PlatformRepo;
use crate::state::AppState;

pub async fn read_platform(state: &AppState, id: String) -> Result<Option<Platform>, String> {
    PlatformRepo::new(&state.db).find_by_id(&id).await
}
