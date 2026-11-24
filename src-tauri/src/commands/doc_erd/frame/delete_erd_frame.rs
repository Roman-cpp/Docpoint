use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn delete_erd_frame(state: State<'_, AppState>, frame_id: String) -> Result<(), String> {
    crate::logging::logged(
        "delete_erd_frame",
        crate::service::delete_erd_frame(&state, frame_id).await,
    )
}
