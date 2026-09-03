use crate::domain::doc_api::endpoint::dto::UpdateEndpointDTO;
use crate::domain::doc_api::endpoint::repository::EndpointRepository;
use crate::repository::sqlite::endpoint::EndpointRepo;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn update_endpoint(
    state: State<'_, AppState>,
    endpoint: UpdateEndpointDTO,
) -> Result<(), String> {
    crate::logging::logged(
        "update_endpoint",
        async { EndpointRepo::new(&state.db).update(&endpoint).await }.await,
    )
}
