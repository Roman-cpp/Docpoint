use crate::domain::platform::entity::Platform;
use crate::domain::platform::repository::PlatformRepository;
use crate::repository::sqlite::platform::PlatformRepo;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn read_platform(
    state: State<'_, AppState>,
    id: String,
) -> Result<Option<Platform>, String> {
    crate::logging::logged(
        "read_platform",
        async { PlatformRepo::new(&state.db).find_by_id(&id).await }.await,
    )
}
