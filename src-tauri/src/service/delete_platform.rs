use crate::domain::platform::repository::{PlatformRepo, PlatformRepository};
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn delete_platform(state: State<'_, AppState>, id: String) -> Result<(), String> {
    PlatformRepo::new(&state.db).delete(&id).await
}
