use crate::domain::doc_api::endpoint::dto::CreateEndpointDTO;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn create_endpoint(
    state: State<'_, AppState>,
    doc_id: String,
    group_id: Option<String>,
    group_label: Option<String>,
    endpoint: CreateEndpointDTO,
) -> Result<(), String> {
    crate::logging::logged(
        "create_endpoint",
        crate::service::create_endpoint(&state, doc_id, group_id, group_label, endpoint).await,
    )
}
