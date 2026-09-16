use serde::Deserialize;

use crate::domain::doc_api::group::dto::CreateGroupDTO;

/// Собственные поля doc-api — то, что не помещается в узел дерева.
#[derive(Debug, Default, Deserialize)]
pub struct DocApiPayload {
    pub prefix: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateDocApiDTO {
    pub id: String,
    pub name: String,
    #[serde(default)]
    pub prefix: String,
}

/// Повторный импорт файла в документ, который уже есть в дереве.
///
/// От [`CreateNodeDTO`](crate::domain::catalog::dto::CreateNodeDTO) отличается
/// тем, что адресует существующий документ: имя и место в дереве остаются за
/// пользователем — файл описывает содержимое, а не то, как документ назван и
/// куда положен.
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncDocApiDTO {
    pub doc_id: String,
    /// Префикс из заголовка файла. `None` — поля в файле нет, и трогать
    /// прежнее значение незачем.
    #[serde(default)]
    pub prefix: Option<String>,
    #[serde(default)]
    pub groups: Vec<CreateGroupDTO>,
}
