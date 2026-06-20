use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Serialize, Deserialize)]
pub struct Endpoint {
    pub id: String,
    pub method: String,
    pub path: String,
    pub name: String,
    pub description: String,
    pub tags: Vec<String>,
    pub auth: bool,
    #[serde(rename = "queryParams")]
    pub query_params: Vec<ParamDef>,
    #[serde(rename = "bodyParams")]
    pub body_params: Vec<ParamDef>,
    pub responses: HashMap<String, ResponseDef>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ParamDef {
    pub name: String,
    #[serde(rename = "type")]
    pub type_: String,
    pub required: bool,
    pub desc: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub default: Option<String>,
    #[serde(default)]
    pub value: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ResponseDef {
    pub label: String,
    pub schema: Vec<ResponseSchemaField>,
    pub example: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ResponseSchemaField {
    pub key: String,
    #[serde(rename = "type")]
    pub type_: String,
    pub desc: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub example: Option<String>,
}
