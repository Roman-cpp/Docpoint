use serde::{Deserialize, Serialize};

/// A directed relation between two entity columns, addressed by entity id and
/// field name: the primary-key side (`from`) to the foreign-key side (`to`).
/// Mirrors the `entity_relation` table.
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EntityRelation {
    pub id: String,
    pub from_entity: String,
    pub from_field: String,
    pub to_entity: String,
    pub to_field: String,
}
