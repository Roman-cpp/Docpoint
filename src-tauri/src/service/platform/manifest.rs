//! Формат содержимого `manifest.json` внутри zip-архива платформы. Экспорт
//! собирает эти структуры из репозиториев и сериализует, импорт — разбирает
//! файл и заводит платформу заново со свежими id.
//!
//! Id узлов и ERD-сущностей в манифесте — реальные id на момент экспорта,
//! используемые только как ключи для связей `parentId` и ERD-связей внутри
//! файла; импорт никогда не переиспользует их как настоящие id.

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

use crate::domain::catalog::entity::NodeKind;
use crate::domain::doc_api::endpoint::entity::{ParamDef, ResponseDef};
use crate::domain::doc_api::endpoint_request::entity::{BodyMode, ParamValue, RequestHeader};
use crate::domain::doc_erd::entity::entity::Entity;
use crate::domain::doc_erd::entity_relation::entity::EntityRelation;
use crate::domain::environment::environment::entity::EnvValue;
use crate::domain::environment::environment_auth::dto::EnvironmentAuthDTO;
use crate::domain::environment::environment_proxy::dto::EnvironmentProxyDTO;

#[derive(Debug, Serialize, Deserialize)]
pub struct Manifest {
    pub version: u32,
    pub platform: ManifestPlatform,
    #[serde(default)]
    pub environments: Vec<ManifestEnvironment>,
    pub nodes: Vec<ManifestNode>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ManifestPlatform {
    pub name: String,
    pub desc: String,
}

/// Окружение платформы вместе с настройками авторизации и прокси. Токен и
/// куки сессии переносятся как есть — в отличие от `duplicate_environment`,
/// который заводит копии с чистой сессией, экспорт/импорт архива переносит ту
/// же платформу целиком.
#[derive(Debug, Serialize, Deserialize)]
pub struct ManifestEnvironment {
    pub env: String,
    pub label: String,
    #[serde(rename = "baseUrl")]
    pub base_url: String,
    pub prefix: String,
    #[serde(default)]
    pub variables: Vec<EnvValue>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub auth: Option<EnvironmentAuthDTO>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub proxy: Option<EnvironmentProxyDTO>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ManifestNode {
    pub id: String,
    #[serde(rename = "parentId")]
    pub parent_id: Option<String>,
    pub kind: NodeKind,
    pub name: String,
    /// Тело markdown-узла.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub content: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub file: Option<ManifestFile>,
    #[serde(default, skip_serializing_if = "Option::is_none", rename = "docApi")]
    pub doc_api: Option<ManifestDocApi>,
    #[serde(default, skip_serializing_if = "Option::is_none", rename = "docWs")]
    pub doc_ws: Option<ManifestDocWs>,
    #[serde(default, skip_serializing_if = "Option::is_none", rename = "docErd")]
    pub doc_erd: Option<ManifestDocErd>,
}

/// Метаданные загруженного файла; сами байты лежат в архиве рядом, под
/// `files/<id узла>/<filename>`.
#[derive(Debug, Serialize, Deserialize)]
pub struct ManifestFile {
    pub filename: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ManifestDocApi {
    pub prefix: String,
    pub groups: Vec<ManifestGroup>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ManifestGroup {
    pub label: String,
    pub endpoints: Vec<ManifestEndpoint>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ManifestEndpoint {
    pub method: String,
    pub path: String,
    pub name: String,
    pub description: String,
    pub auth: bool,
    #[serde(rename = "pathParams")]
    pub path_params: Vec<ParamDef>,
    #[serde(rename = "queryParams")]
    pub query_params: Vec<ParamDef>,
    #[serde(rename = "bodyParams")]
    pub body_params: Vec<ParamDef>,
    pub responses: HashMap<String, ResponseDef>,
    /// Сохранённые наборы «Try it» — экспорт ходит за ними отдельно
    /// (`EndpointRequestRepository::list`), обычное чтение групп их не отдаёт.
    #[serde(default)]
    pub requests: Vec<ManifestEndpointRequest>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ManifestEndpointRequest {
    pub name: String,
    #[serde(rename = "bodyMode")]
    pub body_mode: BodyMode,
    pub body: String,
    #[serde(default)]
    pub headers: Vec<RequestHeader>,
    #[serde(default)]
    pub values: Vec<ParamValue>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ManifestDocWs {
    pub url: String,
    pub messages: Vec<ManifestWebsocketMessage>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ManifestWebsocketMessage {
    pub name: String,
    pub payload: String,
    pub desc: String,
}

/// Таблицы и связи ERD-диаграммы. `Entity`/`EntityRelation` читаются из базы
/// уже в этой форме и переиспользуются как есть — их `id` внутри файла служит
/// только ключом для связей.
#[derive(Debug, Serialize, Deserialize)]
pub struct ManifestDocErd {
    pub entities: Vec<Entity>,
    pub relations: Vec<EntityRelation>,
}
