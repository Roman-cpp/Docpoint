use serde::Deserialize;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateRelationDTO {
    pub from_entity: String,
    pub from_field: String,
    pub to_entity: String,
    pub to_field: String,
}
