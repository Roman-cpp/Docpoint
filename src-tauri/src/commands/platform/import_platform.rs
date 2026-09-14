use crate::domain::platform::entity::Platform;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn import_platform(state: State<'_, AppState>) -> Result<Option<Platform>, String> {
    crate::logging::logged(
        "import_platform",
        crate::service::import_platform(&state).await,
    )
}
