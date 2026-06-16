use crate::domain::endpoint_request::model::EndpointRequest;
use crate::domain::endpoint_request::repository::EndpointRequestRepo;
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
pub async fn rename_endpoint_request(
    state: State<'_, AppState>,
    id: String,
    name: String,
) -> Result<(), String> {
    EndpointRequestRepo::new(&state.db).rename(&id, &name).await
}

#[tauri::command]
pub async fn delete_endpoint_request(
    state: State<'_, AppState>,
    id: String,
) -> Result<(), String> {
    EndpointRequestRepo::new(&state.db).delete(&id).await
}

#[tauri::command]
pub async fn set_request_param_value(
    state: State<'_, AppState>,
    request_id: String,
    kind: String,
    name: String,
    value: String,
) -> Result<(), String> {
    EndpointRequestRepo::new(&state.db)
        .set_value(&request_id, &kind, &name, &value)
        .await
}
