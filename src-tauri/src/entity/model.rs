use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct Entity {
    pub id: String,
    pub name: String,
    pub desc: String,
    pub fields: Vec<EntityField>,
    #[serde(rename = "usedBy", default)]
    pub used_by: Vec<UsedByItem>,
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

#[derive(Debug, Serialize, Deserialize)]
pub struct UsedByItem {
    pub method: String,
    pub path: String,
    pub role: String,
}
