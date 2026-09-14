use crate::domain::doc_api::endpoint::dto::UpdateEndpointDTO;
use crate::domain::doc_api::endpoint::repository::EndpointRepository;
use crate::repository::sqlite::endpoint::EndpointRepo;
use crate::state::AppState;

pub async fn update_endpoint(state: &AppState, endpoint: UpdateEndpointDTO) -> Result<(), String> {
    EndpointRepo::new(&state.db).update(&endpoint).await
}
