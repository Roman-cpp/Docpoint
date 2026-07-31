use serde::Deserialize;

use super::entity::{BodyMode, ParamValue, RequestHeader};

/// Полное состояние набора: фронт правит его локально и присылает целиком.
#[derive(Debug, Deserialize)]
pub struct SaveEndpointRequestDTO {
    pub id: String,
    pub name: String,
    #[serde(rename = "bodyMode")]
    pub body_mode: BodyMode,
    #[serde(rename = "rawBody")]
    pub raw_body: String,
    pub headers: Vec<RequestHeader>,
    pub values: Vec<ParamValue>,
}
