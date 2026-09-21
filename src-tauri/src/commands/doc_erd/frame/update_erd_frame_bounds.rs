use crate::domain::doc_erd::frame::dto::FrameBoundsDTO;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn update_erd_frame_bounds(
    state: State<'_, AppState>,
    bounds: Vec<FrameBoundsDTO>,
) -> Result<(), String> {
    crate::logging::logged(
        "update_erd_frame_bounds",
        crate::service::update_erd_frame_bounds(&state, bounds).await,
    )
}
