use serde::Deserialize;

/// Пара концов связи. Служит и для создания, и для удаления: в таблице
/// `entity_relation` на этот кортеж стоит UNIQUE (миграция 0017), поэтому он
/// адресует связь не хуже её id — а холсту, который знает только сущности и
/// поля, не приходится тянуть за собой ещё и id.
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RelationEndpointsDTO {
    pub from_entity: String,
    pub from_field: String,
    pub to_entity: String,
    pub to_field: String,
}
