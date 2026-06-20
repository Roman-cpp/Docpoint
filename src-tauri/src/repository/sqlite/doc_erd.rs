use crate::domain::doc_erd::doc_erd::dto::{CreateDocErdDTO, UpdateDocErdDTO};
use crate::domain::doc_erd::doc_erd::entity::DocErd;
use sqlx::{Row, SqlitePool};
use uuid::Uuid;
use crate::domain::doc_erd::doc_erd::repository::DocErdRepository;

pub struct DocErdRepo<'a> {
    pub db: &'a SqlitePool,
}

impl<'a> DocErdRepo<'a> {
    pub fn new(db: &'a SqlitePool) -> Self {
        Self { db }
    }
}

impl DocErdRepository for DocErdRepo<'_> {
    async fn all(&self) -> Result<Vec<DocErd>, String> {
        let rows = sqlx::query("SELECT id, name, desc FROM doc_erds ORDER BY name")
            .fetch_all(self.db)
            .await
            .map_err(|e| e.to_string())?;

        Ok(rows
            .iter()
            .map(|r| DocErd {
                id: r.get("id"),
                name: r.get("name"),
                desc: r.get("desc"),
            })
            .collect())
    }

    async fn by_service(&self, service_id: &str) -> Result<Vec<DocErd>, String> {
        let rows =
            sqlx::query("SELECT id, name, desc FROM doc_erds WHERE service_id = ? ORDER BY name")
                .bind(service_id)
                .fetch_all(self.db)
                .await
                .map_err(|e| e.to_string())?;

        Ok(rows
            .iter()
            .map(|r| DocErd {
                id: r.get("id"),
                name: r.get("name"),
                desc: r.get("desc"),
            })
            .collect())
    }

    async fn create(&self, dto: &CreateDocErdDTO) -> Result<String, String> {
        let id = Uuid::new_v4().to_string();

        sqlx::query("INSERT INTO doc_erds (id, name, desc, service_id) VALUES (?, ?, ?, ?)")
            .bind(&id)
            .bind(&dto.name)
            .bind(&dto.desc)
            .bind(&dto.service_id)
            .execute(self.db)
            .await
            .map_err(|e| e.to_string())?;

        Ok(id)
    }

    async fn update(&self, dto: &UpdateDocErdDTO) -> Result<(), String> {
        sqlx::query("UPDATE doc_erds SET name = ?, desc = ? WHERE id = ?")
            .bind(&dto.name)
            .bind(&dto.desc)
            .bind(&dto.id)
            .execute(self.db)
            .await
            .map_err(|e| e.to_string())?;

        Ok(())
    }

    async fn delete(&self, id: &str) -> Result<(), String> {
        sqlx::query("DELETE FROM doc_erds WHERE id = ?")
            .bind(id)
            .execute(self.db)
            .await
            .map_err(|e| e.to_string())?;

        Ok(())
    }
}
