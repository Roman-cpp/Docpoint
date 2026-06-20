use serde::Deserialize;

use super::entity::EntityField;

#[derive(Debug, Deserialize)]
pub struct CreateEntityDTO {
    pub name: String,
    pub desc: String,
    pub fields: Vec<EntityField>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateEntityDTO {
    pub id: String,
    pub name: String,
    pub desc: String,
    pub fields: Vec<EntityField>,
}
