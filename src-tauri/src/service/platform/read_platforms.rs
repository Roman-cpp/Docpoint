use crate::domain::platform::entity::Platform;
use crate::domain::platform::repository::PlatformRepository;
use crate::repository::sqlite::platform::PlatformRepo;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn read_platforms(state: State<'_, AppState>) -> Result<Vec<Platform>, String> {
    crate::logging::logged("read_platforms", async {
        PlatformRepo::new(&state.db).all().await
    }
    .await)
}
