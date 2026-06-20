use serde::{Deserialize, Serialize};

/// Один именованный набор значений параметров для эндпоинта.
#[derive(Debug, Serialize, Deserialize)]
pub struct EndpointRequest {
    pub id: String,
    #[serde(rename = "endpointId")]
    pub endpoint_id: String,
    pub name: String,
    #[serde(rename = "sortOrd")]
    pub sort_ord: i64,
    pub values: Vec<ParamValue>,
}

/// Конкретное значение одного параметра внутри набора.
#[derive(Debug, Serialize, Deserialize)]
pub struct ParamValue {
    pub kind: String,
    pub name: String,
    pub value: String,
}
