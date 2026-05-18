use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct Entity {
    pub id: String,
    pub name: String,
    pub desc: String,
    pub fields: Vec<EntityField>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct EntityField {
    pub name: String,
    #[serde(rename = "type")]
    pub type_: String,
    pub req: bool,
    pub nullable: bool,
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
