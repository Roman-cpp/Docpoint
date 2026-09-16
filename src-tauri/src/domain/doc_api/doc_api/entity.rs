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

/// Что сделал импорт файла в документ. Возвращается вызывающей стороне,
/// потому что «залилось» без подробностей неотличимо от «файл не тот»:
/// нули в отчёте сразу показывают, что файл пуст.
#[derive(Debug, Default, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncReport {
    pub groups_added: usize,
    pub endpoints_added: usize,
    pub endpoints_updated: usize,
}

/// Итог импорта файла. Документ выбирает сам файл — по своему `id`, — поэтому
/// в отчёте есть и он: пользователь не указывал, куда лить, и должен увидеть,
/// куда прилетело и завели ли документ заново.
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportReport {
    pub doc_id: String,
    pub doc_name: String,
    /// `true` — документа с таким id не было, и он заведён импортом.
    pub created: bool,
    #[serde(flatten)]
    pub changes: SyncReport,
}
