use serde::Serialize;

use crate::domain::doc_erd::entity::entity::EntityField;

/// Таблица в том виде, в каком её примет импорт ERD: те же поля, что у
/// `CreateEntityDTO`, минус координаты — раскладку считает вызывающая сторона
/// уже после того, как пользователь отметит нужные таблицы.
#[derive(Debug, Serialize)]
pub struct DbTableDTO {
    pub name: String,
    pub desc: String,
    pub fields: Vec<EntityField>,
}

/// Связь между колонками, адресованная именами: id сущностей появятся только
/// при записи, в `import_erd`.
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DbRelationDTO {
    /// Сторона первичного ключа («один»).
    pub from_table: String,
    pub from_column: String,
    /// Сторона внешнего ключа («многие»).
    pub to_table: String,
    pub to_column: String,
}

/// Что интроспекция изменила или выбросила. Живая схема почти всегда содержит
/// то, чего холст не рисует, и молча терять такие связи нельзя — предпросмотр
/// показывает эти строки списком.
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DbNoticeDTO {
    /// `composite` | `duplicate` | `externalRef` | `empty` | `large`
    pub kind: String,
    pub message: String,
}

/// Схема внешней базы, приведённая к форме импорта ERD.
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DbIntrospectDTO {
    pub schema: String,
    pub tables: Vec<DbTableDTO>,
    pub relations: Vec<DbRelationDTO>,
    pub notices: Vec<DbNoticeDTO>,
}
