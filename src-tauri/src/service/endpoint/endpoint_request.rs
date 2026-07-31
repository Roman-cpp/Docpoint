use crate::domain::doc_api::endpoint_request::dto::SaveEndpointRequestDTO;
use crate::domain::doc_api::endpoint_request::entity::EndpointRequest;
use crate::domain::doc_api::endpoint_request::repository::EndpointRequestRepository;
use crate::repository::sqlite::endpoint_request::EndpointRequestRepo;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn list_endpoint_requests(
    state: State<'_, AppState>,
    endpoint_id: String,
) -> Result<Vec<EndpointRequest>, String> {
    EndpointRequestRepo::new(&state.db).list(&endpoint_id).await
}

#[tauri::command]
pub async fn create_endpoint_request(
    state: State<'_, AppState>,
    endpoint_id: String,
    name: String,
) -> Result<EndpointRequest, String> {
    EndpointRequestRepo::new(&state.db)
        .create(&endpoint_id, &name)
        .await
}

#[tauri::command]
pub async fn delete_endpoint_request(
    state: State<'_, AppState>,
    id: String,
) -> Result<(), String> {
    EndpointRequestRepo::new(&state.db).delete(&id).await
}

#[tauri::command]
pub async fn save_endpoint_request(
    state: State<'_, AppState>,
    request: SaveEndpointRequestDTO,
) -> Result<(), String> {
    EndpointRequestRepo::new(&state.db).save(&request).await
}
