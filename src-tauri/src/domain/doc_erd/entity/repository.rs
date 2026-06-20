use super::dto::{CreateEntityDTO, UpdateEntityDTO};
use super::entity::Entity;

pub trait EntityRepository {
    async fn all(&self, doc_id: &str) -> Result<Vec<Entity>, String>;
    async fn all_by_erd(&self, doc_erd_id: &str) -> Result<Vec<Entity>, String>;
    async fn create(&self, doc_id: &str, schema: &CreateEntityDTO) -> Result<String, String>;
    async fn create_for_erd(
        &self,
        doc_erd_id: &str,
        schema: &CreateEntityDTO,
    ) -> Result<String, String>;
    async fn update(&self, schema: &UpdateEntityDTO) -> Result<(), String>;
    async fn delete(&self, entity_id: &str) -> Result<(), String>;
}
