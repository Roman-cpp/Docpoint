use serde::Deserialize;

use super::entity::EntityField;

#[derive(Debug, Deserialize)]
pub struct CreateEntityDTO {
    pub name: String,
    pub desc: String,
    pub fields: Vec<EntityField>,
}

/// Новое положение одной таблицы на ERD-холсте. Приходит пачкой: холст
/// копит перемещения и сбрасывает их одним вызовом.
#[derive(Debug, Deserialize)]
pub struct EntityPositionDTO {
    pub id: String,
    pub x: f64,
    pub y: f64,
}

#[derive(Debug, Deserialize)]
pub struct UpdateEntityDTO {
    pub id: String,
    pub name: String,
    pub desc: String,
    pub fields: Vec<EntityField>,
}
