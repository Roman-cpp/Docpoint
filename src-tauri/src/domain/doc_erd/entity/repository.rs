use super::dto::{CreateEntityDTO, EntityPositionDTO, UpdateEntityDTO};
use super::entity::Entity;

pub trait EntityRepository {
    async fn all_by_erd(&self, doc_erd_id: &str) -> Result<Vec<Entity>, String>;
    async fn create_for_erd(
        &self,
        doc_erd_id: &str,
        schema: &CreateEntityDTO,
    ) -> Result<String, String>;
    async fn update(&self, schema: &UpdateEntityDTO) -> Result<(), String>;
    /// Сохраняет позиции таблиц на холсте одной транзакцией. Полей схемы не
    /// касается, поэтому перетаскивание не конфликтует с редактированием.
    async fn update_positions(&self, positions: &[EntityPositionDTO]) -> Result<(), String>;
    async fn delete(&self, entity_id: &str) -> Result<(), String>;
}
