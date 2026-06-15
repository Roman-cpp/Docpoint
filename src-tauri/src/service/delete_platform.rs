use crate::domain::environment::repository::{EnvironmentRepo, EnvironmentRepository};
use crate::domain::platform::repository::{PlatformRepo, PlatformRepository};
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn delete_platform(state: State<'_, AppState>, id: String) -> Result<(), String> {
    let platform = PlatformRepo::new(&state.db).find_by_id(&id).await?;

    PlatformRepo::new(&state.db).delete(&id).await?;

    if let Some(platform) = platform {
        EnvironmentRepo::new(&state.db).delete(&platform.id).await?;
    }

    Ok(())
}
