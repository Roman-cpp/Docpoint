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

/// Сегменты пути к полю: `data[].id` → `data` (массив), `id`.
///
/// Скобки означают «элемент массива», а не индекс: форма у элементов одна.
/// При обходе документа берётся первый — он и есть образец этой формы.
fn segments(path: &str) -> Vec<(String, bool)> {
    path.split('.')
        .filter(|part| !part.is_empty())
        .map(|part| {
            (
                part.trim_end_matches("[]").to_string(),
                part.ends_with("[]"),
            )
        })
        .collect()
}

/// Дописывает значение в документ по пути, если там ещё пусто.
///
/// Родительские узлы не создаются: путь, у которого нет ветки, описывает поле,
/// которого в этом документе не бывает, — такое остаётся примечанием без места,
/// и придумывать под него структуру неправильно. Возвращает `true`, если
/// значение действительно легло.
pub fn graft(document: &mut serde_json::Value, path: &str, value: serde_json::Value) -> bool {
    let parts = segments(path);
    let Some(((last, last_list), parents)) = parts.split_last() else {
        return false;
    };

    let mut node = document;
    for (key, list) in parents {
        node = match node {
            serde_json::Value::Object(map) => match map.get_mut(key) {
                Some(child) => child,
                None => return false,
            },
            _ => return false,
        };
        if *list {
            node = match node {
                serde_json::Value::Array(items) if !items.is_empty() => &mut items[0],
                _ => return false,
            };
        }
    }

    let serde_json::Value::Object(map) = node else {
        return false;
    };
    if map.contains_key(last) {
        return false;
    }

    map.insert(
        last.clone(),
        if *last_list {
            serde_json::Value::Array(vec![value])
        } else {
            value
        },
    );
    true
}
