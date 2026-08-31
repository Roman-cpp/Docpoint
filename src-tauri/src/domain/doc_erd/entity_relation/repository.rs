use super::dto::RelationEndpointsDTO;
use super::entity::EntityRelation;

pub trait RelationRepository {
    /// Все связи диаграммы или API-дока: сущности первой лежат под
    /// `doc_erd_id`, второй — под `doc_id`, поэтому один и тот же
    /// идентификатор проверяется по обеим колонкам.
    async fn by_doc(&self, doc_id: &str) -> Result<Vec<EntityRelation>, String>;
    async fn create(&self, dto: &RelationEndpointsDTO) -> Result<String, String>;
    async fn delete(&self, dto: &RelationEndpointsDTO) -> Result<(), String>;
}
