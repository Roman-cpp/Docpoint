use crate::domain::platform::model::Platform;
use crate::domain::platform::repository::{PlatformRepo, PlatformRepository};
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn read_platform(
    state: State<'_, AppState>,
    id: String,
) -> Result<Option<Platform>, String> {
    PlatformRepo::new(&state.db).find_by_id(&id).await
}
