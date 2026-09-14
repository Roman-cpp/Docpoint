use crate::infrastructure::http_client::{RequestPayload, ResponsePayload};
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn send_request(
    state: State<'_, AppState>,
    payload: RequestPayload,
) -> Result<ResponsePayload, String> {
    crate::logging::logged(
        "send_request",
        crate::service::send_request(&state, payload).await,
    )
}
