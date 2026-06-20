use super::dto::CreateRelationDTO;
use super::entity::EntityRelation;

pub trait RelationRepository {
    /// All relations whose source entity belongs to the given doc — the set the
    /// canvas needs alongside `read_schemas(doc_id)`.
    async fn by_doc(&self, doc_id: &str) -> Result<Vec<EntityRelation>, String>;
    async fn create(&self, dto: &CreateRelationDTO) -> Result<String, String>;
    async fn delete(&self, id: &str) -> Result<(), String>;
}
