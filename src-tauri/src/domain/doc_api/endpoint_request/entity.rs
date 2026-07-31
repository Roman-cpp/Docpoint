use serde::{Deserialize, Serialize};

/// Способ задать тело запроса: по полям схемы эндпоинта или сырым JSON,
/// который уходит на сервер без обработки.
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum BodyMode {
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
    #[serde(rename = "rawBody")]
    pub raw_body: String,
    pub headers: Vec<RequestHeader>,
    pub values: Vec<ParamValue>,
}

/// Произвольный заголовок запроса, заданный пользователем.
#[derive(Debug, Serialize, Deserialize)]
pub struct RequestHeader {
    pub name: String,
    pub value: String,
    pub enabled: bool,
}

/// Конкретное значение одного параметра внутри набора.
#[derive(Debug, Serialize, Deserialize)]
pub struct ParamValue {
    pub kind: String,
    pub name: String,
    pub value: String,
}
