use crate::domain::doc_api::endpoint_request::dto::SaveEndpointRequestDTO;
use crate::domain::doc_api::endpoint_request::entity::EndpointRequest;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn list_endpoint_requests(
    state: State<'_, AppState>,
    endpoint_id: String,
) -> Result<Vec<EndpointRequest>, String> {
    crate::logging::logged(
        "list_endpoint_requests",
        crate::service::list_endpoint_requests(&state, endpoint_id).await,
    )
}

#[tauri::command]
pub async fn create_endpoint_request(
    state: State<'_, AppState>,
    endpoint_id: String,
    name: String,
) -> Result<EndpointRequest, String> {
    crate::logging::logged(
        "create_endpoint_request",
        crate::service::create_endpoint_request(&state, endpoint_id, name).await,
    )
}

#[tauri::command]
pub async fn delete_endpoint_request(state: State<'_, AppState>, id: String) -> Result<(), String> {
    crate::logging::logged(
        "delete_endpoint_request",
        crate::service::delete_endpoint_request(&state, id).await,
    )
}

#[tauri::command]
pub async fn save_endpoint_request(
    state: State<'_, AppState>,
    request: SaveEndpointRequestDTO,
) -> Result<(), String> {
    crate::logging::logged(
        "save_endpoint_request",
        crate::service::save_endpoint_request(&state, request).await,
    )
}
