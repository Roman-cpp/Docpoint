use serde::{Deserialize, Serialize};

/// Каким редактором открывать тело набора: формой по полям схемы эндпоинта
/// или редактором JSON. Тело в обоих случаях одно и то же — колонка `body`;
/// это настройка отображения, а не признак того, где лежат данные.
#[derive(Debug, Clone, Copy, PartialEq, Default, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum BodyMode {
    /// Совпадает с DEFAULT колонки `endpoint_requests.body_mode`.
    #[default]
    Fields,
    Raw,
}

impl BodyMode {
    pub fn as_str(self) -> &'static str {
        match self {
            BodyMode::Fields => "fields",
            BodyMode::Raw => "raw",
        }
    }

    pub fn parse(raw: &str) -> Self {
        match raw {
            "raw" => BodyMode::Raw,
            _ => BodyMode::Fields,
        }
    }
}

/// Один именованный набор значений параметров для эндпоинта.
#[derive(Debug, Serialize, Deserialize)]
pub struct EndpointRequest {
    pub id: String,
    #[serde(rename = "endpointId")]
    pub endpoint_id: String,
    pub name: String,
    #[serde(rename = "sortOrd")]
    pub sort_ord: i64,
    #[serde(rename = "bodyMode")]
    pub body_mode: BodyMode,
    /// Тело запроса как JSON-документ. Пустая строка — тела нет.
    pub body: String,
    pub headers: Vec<RequestHeader>,
    pub values: Vec<ParamValue>,
}

/// Произвольный заголовок запроса, заданный пользователем.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RequestHeader {
    pub name: String,
    pub value: String,
    /// В файле импорта поле можно опустить: заголовок без пометки —
    /// включённый. Фронт всегда присылает его явно.
    #[serde(default = "enabled_by_default")]
    pub enabled: bool,
}

fn enabled_by_default() -> bool {
    true
}

/// Конкретное значение одного параметра внутри набора.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ParamValue {
    pub kind: String,
    pub name: String,
    pub value: String,
}
