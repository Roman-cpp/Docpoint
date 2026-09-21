use crate::domain::doc_erd::frame::dto::CreateFrameDTO;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn create_erd_frame(
    state: State<'_, AppState>,
    doc_erd_id: String,
    frame: CreateFrameDTO,
) -> Result<String, String> {
    crate::logging::logged(
        "create_erd_frame",
        crate::service::create_erd_frame(&state, doc_erd_id, frame).await,
    )
}
