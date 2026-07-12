use serde::Deserialize;
use std::collections::HashMap;

use super::entity::{ParamDef, ResponseDef};

#[derive(Debug, Deserialize)]
pub struct CreateEndpointDTO {
    pub method: String,
    pub path: String,
    pub name: String,
    #[serde(default)]
    pub description: String,
    #[serde(default)]
    pub tags: Vec<String>,
    #[serde(default)]
    pub auth: bool,
    #[serde(rename = "queryParams", default)]
    pub query_params: Vec<ParamDef>,
    #[serde(rename = "bodyParams", default)]
    pub body_params: Vec<ParamDef>,
    #[serde(default)]
    pub responses: HashMap<String, ResponseDef>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateEndpointDTO {
    pub id: String,
    pub method: String,
    pub path: String,
    pub name: String,
    #[serde(default)]
    pub description: String,
    #[serde(default)]
    pub tags: Vec<String>,
    #[serde(default)]
    pub auth: bool,
    #[serde(rename = "queryParams", default)]
    pub query_params: Vec<ParamDef>,
    #[serde(rename = "bodyParams", default)]
    pub body_params: Vec<ParamDef>,
}
