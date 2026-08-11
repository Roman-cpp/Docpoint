use serde::Deserialize;
use std::collections::HashMap;

use super::entity::{ParamDef, ResponseDef};
use crate::domain::doc_api::endpoint_request::dto::ImportEndpointRequestDTO;

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
    /// Описания сегментов пути; сам перечень сегментов берётся из `path`.
    #[serde(rename = "pathParams", default)]
    pub path_params: Vec<ParamDef>,
    #[serde(rename = "queryParams", default)]
    pub query_params: Vec<ParamDef>,
    #[serde(rename = "bodyParams", default)]
    pub body_params: Vec<ParamDef>,
    #[serde(default)]
    pub responses: HashMap<String, ResponseDef>,
    /// Наборы «Try it», приезжающие вместе с эндпоинтом при импорте файла.
    /// Пустые при обычном создании эндпоинта из UI.
    #[serde(default)]
    pub requests: Vec<ImportEndpointRequestDTO>,
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
    /// Описания сегментов пути; сам перечень сегментов берётся из `path`.
    #[serde(rename = "pathParams", default)]
    pub path_params: Vec<ParamDef>,
    #[serde(rename = "queryParams", default)]
    pub query_params: Vec<ParamDef>,
    #[serde(rename = "bodyParams", default)]
    pub body_params: Vec<ParamDef>,
}
