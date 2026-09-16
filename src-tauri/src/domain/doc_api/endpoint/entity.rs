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

/// Проверяет, что каждое описание сегмента ссылается на сегмент из пути.
///
/// Описание сегмента, которого в пути нет, — почти всегда опечатка: и панель,
/// и документация ищут описания по именам из самого пути, так что лишняя
/// запись просто пропала бы из виду. Проверка вынесена из репозитория, потому
/// что повторный импорт сверяет весь файл до первой записи в базу.
pub fn check_path_params(method: &str, path: &str, params: &[ParamDef]) -> Result<(), String> {
    let segments = path_segments(path);
    for param in params {
        if !segments.contains(&param.name.as_str()) {
            return Err(format!(
                "эндпоинт {method} {path}: в пути нет сегмента {:?}",
                param.name
            ));
        }
    }
    Ok(())
}

/// Найденный в документе эндпоинт: id для записи и группа, в которой он
/// сейчас лежит. Группу возвращаем вместе с id, чтобы повторный импорт
/// увидел переезд эндпоинта в другую группу, не ходя за ним второй раз.
#[derive(Debug)]
pub struct EndpointRef {
    pub id: String,
    pub group_id: String,
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

#[derive(Debug, Clone, Serialize, Deserialize)]
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

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResponseDef {
    pub label: String,
    pub schema: Vec<ResponseSchemaField>,
    pub example: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResponseSchemaField {
    pub key: String,
    #[serde(rename = "type")]
    pub type_: String,
    pub desc: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub example: Option<String>,
}
