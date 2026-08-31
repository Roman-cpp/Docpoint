use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Имена сегментов пути: `/posts/{postId}/comments/{commentId}` → `postId`,
/// `commentId`. Именно путь задаёт перечень сегментов — `pathParams` только
/// описывает их.
pub fn path_segments(path: &str) -> Vec<&str> {
    let mut names = Vec::new();
    let mut rest = path;
    while let Some(open) = rest.find('{') {
        let after = &rest[open + 1..];
        let Some(close) = after.find('}') else { break };
        names.push(&after[..close]);
        rest = &after[close + 1..];
    }
    names
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Endpoint {
    pub id: String,
    pub method: String,
    pub path: String,
    pub name: String,
    pub description: String,
    pub auth: bool,
    /// Описания сегментов пути: имя совпадает с тем, что стоит в фигурных
    /// скобках `path`. Сам перечень сегментов задаёт путь, а не эта секция —
    /// здесь у них появляются тип, описание и пометка обязательности.
    #[serde(rename = "pathParams")]
    pub path_params: Vec<ParamDef>,
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
