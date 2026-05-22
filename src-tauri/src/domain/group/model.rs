use crate::domain::endpoint::model::{CreateEndpointDTO, Endpoint};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct Group {
    pub id: String,
    pub label: String,
    pub endpoints: Vec<Endpoint>,
}

#[derive(Debug, Deserialize)]
pub struct CreateGroupDTO {
    pub label: String,
    pub endpoints: Vec<CreateEndpointDTO>,
}
