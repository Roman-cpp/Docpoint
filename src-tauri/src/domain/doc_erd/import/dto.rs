use serde::Deserialize;

use crate::domain::doc_erd::entity::dto::CreateEntityDTO;

/// Таблица из файла импорта. Id у неё ещё нет — его выдаёт база при вставке,
/// поэтому связи ниже адресуют таблицы именами.
#[derive(Debug, Deserialize)]
pub struct ImportTableDTO {
    #[serde(flatten)]
    pub schema: CreateEntityDTO,
    /// Положение на холсте: раскладку импортируемой диаграммы считает
    /// вызывающая сторона, здесь она только сохраняется.
    pub x: f64,
    pub y: f64,
}

/// Связь из файла импорта: оба конца названы именами таблицы и колонки —
/// id сущностей появляются только после вставки, уже здесь, на бэкенде.
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportRelationDTO {
    pub from_table: String,
    pub from_column: String,
    pub to_table: String,
    pub to_column: String,
}
