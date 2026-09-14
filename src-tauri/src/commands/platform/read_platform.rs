use crate::domain::platform::entity::Platform;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn read_platform(
    state: State<'_, AppState>,
    id: String,
) -> Result<Option<Platform>, String> {
    crate::logging::logged(
        "read_platform",
        crate::service::read_platform(&state, id).await,
    )
}
