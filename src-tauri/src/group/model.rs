use crate::endpoint::model::Endpoint;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct Group {
    pub id: String,
    pub label: String,
    pub endpoints: Vec<Endpoint>,
}
