use crate::domain::doc_erd::frame::entity::Frame;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn read_erd_frames(
    state: State<'_, AppState>,
    doc_erd_id: String,
) -> Result<Vec<Frame>, String> {
    crate::logging::logged(
        "read_erd_frames",
        crate::service::read_erd_frames(&state, doc_erd_id).await,
    )
}
