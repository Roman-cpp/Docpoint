use crate::domain::platform::entity::Platform;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn read_platforms(state: State<'_, AppState>) -> Result<Vec<Platform>, String> {
    crate::logging::logged(
        "read_platforms",
        crate::service::read_platforms(&state).await,
    )
}
