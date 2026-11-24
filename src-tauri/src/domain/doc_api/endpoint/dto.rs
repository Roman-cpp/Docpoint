use serde::Deserialize;
use std::collections::HashMap;

use super::entity::{body_from_params, FieldDef, ParamDef, ResponseDef};
use crate::domain::doc_api::endpoint_request::dto::ImportEndpointRequestDTO;
use crate::domain::doc_api::json_doc;

#[derive(Debug, Deserialize)]
pub struct CreateEndpointDTO {
    pub method: String,
    pub path: String,
    pub name: String,
    #[serde(default)]
    pub description: String,
    #[serde(default)]
    pub auth: bool,
    /// Описания сегментов пути; сам перечень сегментов берётся из `path`.
    #[serde(rename = "pathParams", default)]
    pub path_params: Vec<ParamDef>,
    #[serde(rename = "queryParams", default)]
    pub query_params: Vec<ParamDef>,
    #[serde(rename = "headerParams", default)]
    pub header_params: Vec<ParamDef>,
    #[serde(rename = "cookieParams", default)]
    pub cookie_params: Vec<ParamDef>,
    /// Структура тела запроса. В файле пишется объектом, читается и строкой —
    /// тело не обязано быть JSON.
    #[serde(default, deserialize_with = "json_doc::from_json")]
    pub body: String,
    #[serde(rename = "bodyFields", default)]
    pub body_fields: Vec<FieldDef>,
    /// Прежняя форма описания тела: плоский список полей. Читается ради файлов,
    /// написанных до перехода на документ, — см. [`Self::body_document`].
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
    pub auth: bool,
    /// Описания сегментов пути; сам перечень сегментов берётся из `path`.
    #[serde(rename = "pathParams", default)]
    pub path_params: Vec<ParamDef>,
    #[serde(rename = "queryParams", default)]
    pub query_params: Vec<ParamDef>,
    #[serde(rename = "headerParams", default)]
    pub header_params: Vec<ParamDef>,
    #[serde(rename = "cookieParams", default)]
    pub cookie_params: Vec<ParamDef>,
    /// Структура тела запроса. В файле пишется объектом, читается и строкой —
    /// тело не обязано быть JSON.
    #[serde(default, deserialize_with = "json_doc::from_json")]
    pub body: String,
    #[serde(rename = "bodyFields", default)]
    pub body_fields: Vec<FieldDef>,
    /// Прежняя форма описания тела: плоский список полей. Читается ради файлов,
    /// написанных до перехода на документ, — см. [`Self::body_document`].
    #[serde(rename = "bodyParams", default)]
    pub body_params: Vec<ParamDef>,
    /// Ответы правятся целиком, как и параметры: что пришло — то и остаётся.
    #[serde(default)]
    pub responses: HashMap<String, ResponseDef>,
}

/// Тело и примечания к нему, как их описал файл.
///
/// Старые файлы описывали тело плоским списком `bodyParams`; он сворачивается в
/// документ теми же правилами, что и миграция 0048, поэтому файл, написанный до
/// перехода, импортируется в то же состояние, что и сегодняшний. Если в файле
/// есть и то и другое, побеждает документ: он новее и выразительнее.
fn body_document(body: &str, fields: &[FieldDef], legacy: &[ParamDef]) -> (String, Vec<FieldDef>) {
    if !body.is_empty() || !fields.is_empty() {
        return (body.to_string(), fields.to_vec());
    }
    body_from_params(legacy)
}

impl CreateEndpointDTO {
    pub fn body_document(&self) -> (String, Vec<FieldDef>) {
        body_document(&self.body, &self.body_fields, &self.body_params)
    }
}

impl UpdateEndpointDTO {
    pub fn body_document(&self) -> (String, Vec<FieldDef>) {
        body_document(&self.body, &self.body_fields, &self.body_params)
    }
}
