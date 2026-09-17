//! Документ, который хранится текстом, а в файле пишется объектом.
//!
//! Так устроены и тело запроса, и тело набора «Try it»: в базе это строка (не
//! всякое тело — JSON: бывает форма, XML, текст Prometheus), а в файле импорта
//! его удобнее видеть и править настоящим JSON-объектом, а не строкой с
//! экранированными кавычками.

use serde::Deserialize;

/// Читает документ и объектом, и строкой. Объект сериализуется обратно в текст
/// с отступами: в базе документ живёт строкой, и форматирование — часть того,
/// что увидит человек, открыв его в редакторе.
pub fn from_json<'de, D>(deserializer: D) -> Result<String, D::Error>
where
    D: serde::Deserializer<'de>,
{
    let value = serde_json::Value::deserialize(deserializer)?;
    Ok(match value {
        serde_json::Value::Null => String::new(),
        serde_json::Value::String(text) => text,
        other => serde_json::to_string_pretty(&other).map_err(serde::de::Error::custom)?,
    })
}
