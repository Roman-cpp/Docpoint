use crate::domain::doc_erd::entity_relation::dto::RelationEndpointsDTO;
use crate::domain::doc_erd::entity_relation::entity::EntityRelation;
use crate::domain::doc_erd::entity_relation::repository::RelationRepository;
use sqlx::{Row, SqlitePool};
use uuid::Uuid;

pub struct RelationRepo<'a> {
    pub db: &'a SqlitePool,
}

impl<'a> RelationRepo<'a> {
    pub fn new(db: &'a SqlitePool) -> Self {
        Self { db }
    }
}

impl RelationRepository for RelationRepo<'_> {
    async fn by_erd(&self, doc_erd_id: &str) -> Result<Vec<EntityRelation>, String> {
        let rows = sqlx::query(
            "SELECT r.id, r.from_entity, r.from_field, r.to_entity, r.to_field \
             FROM entity_relation r \
             JOIN entities e ON e.id = r.from_entity \
             WHERE e.doc_erd_id = ?",
        )
        .bind(doc_erd_id)
        .fetch_all(self.db)
        .await
        .map_err(|e| e.to_string())?;

        Ok(rows
            .iter()
            .map(|r| EntityRelation {
                id: r.get("id"),
                from_entity: r.get("from_entity"),
                from_field: r.get("from_field"),
                to_entity: r.get("to_entity"),
                to_field: r.get("to_field"),
            })
            .collect())
    }

    async fn create(&self, dto: &RelationEndpointsDTO) -> Result<String, String> {
        let id = Uuid::new_v4().to_string();

        sqlx::query(
            "INSERT INTO entity_relation (id, from_entity, from_field, to_entity, to_field) \
             VALUES (?, ?, ?, ?, ?)",
        )
        .bind(&id)
        .bind(&dto.from_entity)
        .bind(&dto.from_field)
        .bind(&dto.to_entity)
        .bind(&dto.to_field)
        .execute(self.db)
        .await
        .map_err(|e| e.to_string())?;

        Ok(id)
    }

    async fn delete(&self, dto: &RelationEndpointsDTO) -> Result<(), String> {
        sqlx::query(
            "DELETE FROM entity_relation \
             WHERE from_entity = ? AND from_field = ? AND to_entity = ? AND to_field = ?",
        )
        .bind(&dto.from_entity)
        .bind(&dto.from_field)
        .bind(&dto.to_entity)
        .bind(&dto.to_field)
        .execute(self.db)
        .await
        .map_err(|e| e.to_string())?;

        Ok(())
    }
}
