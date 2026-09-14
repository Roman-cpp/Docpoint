use serde::Serialize;

/// Файл, забранный в хранилище: под каким именем он там лежит и сколько весит.
/// Имя документа живёт в узле дерева и с этим именем не связано — программа
/// открывает файл под тем же именем, под каким он пришёл.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StoredFile {
    pub filename: String,
    pub size: i64,
}
