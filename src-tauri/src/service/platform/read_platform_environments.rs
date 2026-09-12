use crate::domain::environment::environment::entity::Environment;
use crate::domain::platform::repository::PlatformRepository;
use crate::repository::sqlite::platform::PlatformRepo;
use crate::state::AppState;

pub async fn environments_by_platform(
    state: &AppState,
    platform_id: String,
) -> Result<Vec<Environment>, String> {
    PlatformRepo::new(&state.db)
        .environments_by_platform(&platform_id)
        .await
}
