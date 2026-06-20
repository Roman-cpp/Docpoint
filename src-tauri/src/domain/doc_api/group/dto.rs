use serde::Deserialize;

use crate::domain::doc_api::endpoint::dto::CreateEndpointDTO;

#[derive(Debug, Deserialize)]
pub struct CreateGroupDTO {
    pub label: String,
    pub endpoints: Vec<CreateEndpointDTO>,
}
