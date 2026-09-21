use crate::domain::doc_erd::frame::dto::UpdateFrameDTO;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn update_erd_frame(
    state: State<'_, AppState>,
    frame: UpdateFrameDTO,
) -> Result<(), String> {
    crate::logging::logged(
        "update_erd_frame",
        crate::service::update_erd_frame(&state, frame).await,
    )
}
