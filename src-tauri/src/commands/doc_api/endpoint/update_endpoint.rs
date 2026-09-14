use crate::domain::doc_api::endpoint::dto::UpdateEndpointDTO;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn update_endpoint(
    state: State<'_, AppState>,
    endpoint: UpdateEndpointDTO,
) -> Result<(), String> {
    crate::logging::logged(
        "update_endpoint",
        crate::service::update_endpoint(&state, endpoint).await,
    )
}
