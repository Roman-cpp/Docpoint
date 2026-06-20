use crate::domain::doc_api::endpoint::repository::EndpointRepository;
use crate::repository::sqlite::endpoint::EndpointRepo;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn delete_endpoint(
    state: State<'_, AppState>,
    endpoint_id: String,
) -> Result<(), String> {
    EndpointRepo::new(&state.db).delete(&endpoint_id).await
}
