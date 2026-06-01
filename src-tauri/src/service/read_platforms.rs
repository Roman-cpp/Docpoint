use crate::domain::platform::model::Platform;
use crate::domain::platform::repository::{PlatformRepo, PlatformRepository};
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn read_platforms(state: State<'_, AppState>) -> Result<Vec<Platform>, String> {
    PlatformRepo::new(&state.db).all().await
}
