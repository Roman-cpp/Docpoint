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

/// Файл, выбранный в системном диалоге, но ещё не забранный в хранилище: путь,
/// по которому его заберёт бэкенд, и то, что показать в окне создания.
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PickedFile {
    pub path: String,
    pub name: String,
    pub size: i64,
}
