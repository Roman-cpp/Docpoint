use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct Entity {
    pub id: String,
    pub name: String,
    pub desc: String,
    pub fields: Vec<EntityField>,
    /// Позиция таблицы на ERD-холсте; `None` — сущность ещё не размещали и
    /// сцена разложит её автолейаутом (см. миграцию 0033).
    #[serde(rename = "posX", default)]
    pub pos_x: Option<f64>,
    #[serde(rename = "posY", default)]
    pub pos_y: Option<f64>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct EntityField {
    pub name: String,
    #[serde(rename = "type")]
    pub type_: String,
    pub req: bool,
    pub nullable: bool,
    #[serde(default)]
    pub pk: bool,
    pub desc: String,
    pub note: String,
    pub example: String,
    #[serde(rename = "enum", default)]
    pub enum_: Vec<EnumValue>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct EnumValue {
    pub val: String,
    pub desc: String,
}
