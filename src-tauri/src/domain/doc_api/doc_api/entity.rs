use serde::{Deserialize, Serialize};

/// Документ-описание HTTP API. Имя, описание и место в дереве живут в узле
/// (`catalog_node`), здесь — собственные поля документа; `id` у узла и документа
/// общий.
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DocApi {
    pub id: String,
    pub name: String,
    pub desc: String,
    /// Дописывается после префикса окружения при сборке URL запроса.
    pub prefix: String,
    pub tags: Vec<String>,
}
