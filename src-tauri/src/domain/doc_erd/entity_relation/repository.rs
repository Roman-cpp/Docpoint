use super::dto::RelationEndpointsDTO;
use super::entity::EntityRelation;

pub trait RelationRepository {
    /// Все связи диаграммы: обе сущности связи принадлежат ей же.
    async fn by_erd(&self, doc_erd_id: &str) -> Result<Vec<EntityRelation>, String>;
    async fn create(&self, dto: &RelationEndpointsDTO) -> Result<String, String>;
    async fn delete(&self, dto: &RelationEndpointsDTO) -> Result<(), String>;
}
