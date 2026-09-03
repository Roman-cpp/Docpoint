use serde::{Deserialize, Serialize};

/// Документ-описание HTTP API. Имя и место в дереве живут в узле
/// (`catalog_node`), здесь — собственные поля документа; `id` у узла и документа
/// общий.
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DocApi {
    pub id: String,
    pub name: String,
    /// Дописывается после префикса окружения при сборке URL запроса.
    pub prefix: String,
}
