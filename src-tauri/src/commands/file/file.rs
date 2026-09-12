use crate::state::AppState;
use tauri::{AppHandle, State};

#[tauri::command]
pub async fn open_file_node(
    app: AppHandle,
    state: State<'_, AppState>,
    id: String,
) -> Result<(), String> {
    crate::logging::logged(
        "open_file_node",
        crate::service::open_file_node(app, &state, id).await,
    )
}
