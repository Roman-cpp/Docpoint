use crate::endpoint::model::{CreateEndpoint, Endpoint};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct Group {
    pub id: String,
    pub label: String,
    pub endpoints: Vec<Endpoint>,
}

#[derive(Debug, Deserialize)]
pub struct CreateGroup {
    pub label: String,
    pub endpoints: Vec<CreateEndpoint>,
}
