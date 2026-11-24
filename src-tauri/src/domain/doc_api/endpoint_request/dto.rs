use serde::Deserialize;
use std::collections::BTreeMap;

use super::entity::{BodyMode, ParamValue, RequestCookie, RequestHeader};
use crate::domain::doc_api::json_doc;

/// Полное состояние набора: фронт правит его локально и присылает целиком.
#[derive(Debug, Deserialize)]
pub struct SaveEndpointRequestDTO {
    pub id: String,
    pub name: String,
    #[serde(rename = "bodyMode")]
    pub body_mode: BodyMode,
    pub body: String,
    pub headers: Vec<RequestHeader>,
    pub cookies: Vec<RequestCookie>,
    pub values: Vec<ParamValue>,
}

/// Набор запроса внутри импортируемого файла.
///
/// Части запроса названы своими именами: `path` — подстановки в сегменты
/// пути (`/posts/{postId}`), `query` — строка запроса, `headers` —
/// заголовки, `body` — тело. Плоский список `values` остаётся ради файлов,
/// написанных по прежней версии формата.
///
/// `id`, `endpointId` и `sortOrd` из файла намеренно не читаются: id
/// генерируются заново (иначе повторный импорт того же файла упал бы на
/// первичном ключе), а порядок берётся из позиции в массиве. Serde игнорирует
/// лишние поля, поэтому экспортированный `EndpointRequest` подходит как есть.
#[derive(Debug, Deserialize)]
pub struct ImportEndpointRequestDTO {
    #[serde(default)]
    pub name: String,
    #[serde(rename = "bodyMode", default)]
    pub body_mode: BodyMode,
    #[serde(default, deserialize_with = "json_doc::from_json")]
    pub body: String,
    #[serde(default, deserialize_with = "headers_from_json")]
    pub headers: Vec<RequestHeader>,
    /// Куки набора: объектом «имя → значение» или списком, если нужна
    /// выключенная, — ровно как заголовки.
    #[serde(default, deserialize_with = "cookies_from_json")]
    pub cookies: Vec<RequestCookie>,
    /// Значения для сегментов пути: имя из фигурных скобок → значение.
    #[serde(default, deserialize_with = "scalar_map")]
    pub path: BTreeMap<String, String>,
    /// Значения параметров строки запроса.
    #[serde(default, deserialize_with = "scalar_map")]
    pub query: BTreeMap<String, String>,
    /// Прежняя форма записи тех же path и query: `{ kind, name, value }`.
    /// Карты `path`/`query` перекрывают её при совпадении имён.
    #[serde(default)]
    pub values: Vec<ParamValue>,
}

/// Значения path- и query-параметров. В URL всё равно уезжает текст, поэтому
/// числа и булевы принимаются без кавычек и приводятся к строке здесь —
/// иначе `"page": 1` в рукописном файле ронял бы весь импорт.
fn scalar_map<'de, D>(deserializer: D) -> Result<BTreeMap<String, String>, D::Error>
where
    D: serde::Deserializer<'de>,
{
    let raw = BTreeMap::<String, serde_json::Value>::deserialize(deserializer)?;
    let mut result = BTreeMap::new();
    for (name, value) in raw {
        result.insert(name.clone(), scalar_to_string(&name, value)?);
    }
    Ok(result)
}

fn scalar_to_string<E: serde::de::Error>(
    name: &str,
    value: serde_json::Value,
) -> Result<String, E> {
    match value {
        serde_json::Value::String(text) => Ok(text),
        serde_json::Value::Number(number) => Ok(number.to_string()),
        serde_json::Value::Bool(flag) => Ok(flag.to_string()),
        serde_json::Value::Null => Ok(String::new()),
        _ => Err(E::custom(format!(
            "значение {name:?} должно быть строкой или числом: объект и массив в URL и заголовок не помещаются"
        ))),
    }
}

/// Заголовки набора: объектом `{ "X-Request-Id": "smoke" }` — так пишут
/// обычный случай, — или массивом, когда заголовок нужно сохранить
/// выключенным или задать точный порядок. Объект serde отдаёт
/// отсортированным по имени.
fn headers_from_json<'de, D>(deserializer: D) -> Result<Vec<RequestHeader>, D::Error>
where
    D: serde::Deserializer<'de>,
{
    #[derive(Deserialize)]
    #[serde(untagged)]
    enum Shape {
        List(Vec<RequestHeader>),
        Map(BTreeMap<String, serde_json::Value>),
    }

    Ok(match Shape::deserialize(deserializer)? {
        Shape::List(headers) => headers,
        Shape::Map(map) => {
            let mut headers = Vec::with_capacity(map.len());
            for (name, value) in map {
                let value = scalar_to_string(&name, value)?;
                headers.push(RequestHeader {
                    name,
                    value,
                    enabled: true,
                });
            }
            headers
        }
    })
}

/// Куки набора читаются так же, как заголовки: объектом «имя → значение» или
/// списком, когда нужна выключенная.
fn cookies_from_json<'de, D>(deserializer: D) -> Result<Vec<RequestCookie>, D::Error>
where
    D: serde::Deserializer<'de>,
{
    #[derive(Deserialize)]
    #[serde(untagged)]
    enum Shape {
        List(Vec<RequestCookie>),
        Map(BTreeMap<String, serde_json::Value>),
    }

    Ok(match Shape::deserialize(deserializer)? {
        Shape::List(cookies) => cookies,
        Shape::Map(map) => {
            let mut cookies = Vec::with_capacity(map.len());
            for (name, value) in map {
                let value = scalar_to_string(&name, value)?;
                cookies.push(RequestCookie {
                    name,
                    value,
                    enabled: true,
                });
            }
            cookies
        }
    })
}
