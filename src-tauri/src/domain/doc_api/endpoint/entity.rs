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

/// Проверяет примечания к полям документа: путь непуст и не повторяется.
///
/// Существование пути в самом документе намеренно не проверяется. Поле, которого
/// в документе нет, — обычное дело: необязательный ключ, который сервер вернёт
/// не всегда, описывают, а в пример не кладут. Отказ импорта здесь потерял бы
/// документацию вместо того, чтобы её показать, — такое поле видно на странице
/// отдельной пометкой.
pub fn check_field_paths(
    method: &str,
    path: &str,
    what: &str,
    fields: &[FieldDef],
) -> Result<(), String> {
    let mut seen = std::collections::HashSet::new();
    for field in fields {
        if field.path.trim().is_empty() {
            return Err(format!(
                "эндпоинт {method} {path}: у примечания {what} пустой путь"
            ));
        }
        if !seen.insert(field.path.as_str()) {
            return Err(format!(
                "эндпоинт {method} {path}: путь {:?} описан дважды ({what}) — \
                 оставьте одно примечание, иначе непонятно, какое настоящее",
                field.path
            ));
        }
    }
    Ok(())
}

/// Сворачивает плоский список полей тела в документ и примечания к нему.
///
/// Так тело описывали файлы прежнего формата (`bodyParams`). Правила те же, что
/// у миграции 0048: значение поля — его умолчание, иначе образец по типу; в
/// `format` уходит только то, чего документ сказать не может.
pub fn body_from_params(params: &[ParamDef]) -> (String, Vec<FieldDef>) {
    let mut document = serde_json::Map::new();
    let mut fields = Vec::with_capacity(params.len());

    for param in params {
        document.insert(param.name.clone(), sample_value(param));
        fields.push(FieldDef {
            path: param.name.clone(),
            format: type_format(&param.type_).to_string(),
            required: param.required,
            desc: param.desc.clone(),
        });
    }

    let body = if document.is_empty() {
        String::new()
    } else {
        serde_json::to_string_pretty(&serde_json::Value::Object(document)).unwrap_or_default()
    };
    (body, fields)
}

/// Образец значения по типу параметра: то же, что подставляет пример вызова на
/// странице эндпоинта, — документ и сниппет должны говорить одно и то же.
fn sample_value(param: &ParamDef) -> serde_json::Value {
    let type_ = param.type_.to_lowercase();

    if let Some(default) = param
        .default
        .as_deref()
        .map(str::trim)
        .filter(|d| !d.is_empty())
    {
        if matches!(
            type_.as_str(),
            "integer" | "int" | "long" | "number" | "float" | "double"
        ) {
            if let Ok(number) = default.parse::<serde_json::Number>() {
                return serde_json::Value::Number(number);
            }
        }
        if matches!(type_.as_str(), "boolean" | "bool") {
            if let Ok(flag) = default.parse::<bool>() {
                return serde_json::Value::Bool(flag);
            }
        }
        return serde_json::Value::String(default.to_string());
    }

    match type_.as_str() {
        "object" => serde_json::Value::Object(serde_json::Map::new()),
        "array" => serde_json::Value::Array(Vec::new()),
        "boolean" | "bool" => serde_json::Value::Bool(true),
        "integer" | "int" | "long" | "number" | "float" | "double" => {
            serde_json::Value::Number(0.into())
        }
        "uuid" => serde_json::Value::String("00000000-0000-0000-0000-000000000000".into()),
        "datetime" | "date-time" => serde_json::Value::String("2026-01-01T00:00:00Z".into()),
        "date" => serde_json::Value::String("2026-01-01".into()),
        _ => serde_json::Value::String(format!("<{}>", param.name)),
    }
}

/// Уточнение типа для примечания: то, чего в самом документе не видно.
fn type_format(type_: &str) -> &'static str {
    match type_.to_lowercase().as_str() {
        "uuid" => "uuid",
        "datetime" | "date-time" => "datetime",
        "date" => "date",
        "email" => "email",
        "integer" | "int" | "long" => "integer",
        _ => "",
    }
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
    /// Структура тела запроса: JSON-документ целиком. Пустая строка — тела
    /// нет. Документ задаёт и форму, и типы значений, поэтому плоского списка
    /// полей рядом с ним не нужно.
    pub body: String,
    /// Примечания к полям документа — то, чего сам JSON о себе не расскажет.
    #[serde(rename = "bodyFields")]
    pub body_fields: Vec<FieldDef>,
    pub responses: HashMap<String, ResponseDef>,
}

/// Примечание к одному полю документа.
///
/// Тип поля виден в самом документе (`"count": 0` — число), поэтому здесь его
/// нет: только `format` — уточнение для того, чего JSON не различает (`uuid`,
/// `datetime`, `integer`), и пустое, когда уточнять нечего.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FieldDef {
    /// Путь к полю внутри документа: `title`, `meta.total`, `data[].id`.
    pub path: String,
    #[serde(default)]
    pub format: String,
    #[serde(default)]
    pub required: bool,
    #[serde(default)]
    pub desc: String,
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
