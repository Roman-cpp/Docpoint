use crate::domain::websocket::doc_websocket::dto::{CreateDocWebsocketDTO, UpdateDocWebsocketDTO};
use crate::domain::websocket::doc_websocket::entity::DocWebsocket;
use crate::domain::websocket::doc_websocket::repository::DocWebsocketRepository;
use sqlx::{Row, SqlitePool};
use uuid::Uuid;

pub struct DocWebsocketRepo<'a> {
    pub db: &'a SqlitePool,
}

impl<'a> DocWebsocketRepo<'a> {
    pub fn new(db: &'a SqlitePool) -> Self {
        Self { db }
    }
}

impl DocWebsocketRepository for DocWebsocketRepo<'_> {
    async fn all(&self) -> Result<Vec<DocWebsocket>, String> {
        let rows =
            sqlx::query("SELECT id, name, desc, url, created_at FROM doc_websockets ORDER BY name")
                .fetch_all(self.db)
                .await
                .map_err(|e| e.to_string())?;

        Ok(rows
            .iter()
            .map(|r| DocWebsocket {
                id: r.get("id"),
                name: r.get("name"),
                desc: r.get("desc"),
                url: r.get("url"),
                created_at: r.get("created_at"),
            })
            .collect())
    }

    async fn by_service(&self, service_id: &str) -> Result<Vec<DocWebsocket>, String> {
        let rows = sqlx::query(
            "SELECT id, name, desc, url, created_at FROM doc_websockets WHERE service_id = ? ORDER BY name",
        )
        .bind(service_id)
        .fetch_all(self.db)
        .await
        .map_err(|e| e.to_string())?;

        Ok(rows
            .iter()
            .map(|r| DocWebsocket {
                id: r.get("id"),
                name: r.get("name"),
                desc: r.get("desc"),
                url: r.get("url"),
                created_at: r.get("created_at"),
            })
            .collect())
    }

    async fn create(&self, dto: &CreateDocWebsocketDTO) -> Result<String, String> {
        let id = Uuid::new_v4().to_string();

        sqlx::query(
            "INSERT INTO doc_websockets (id, name, desc, url, service_id) VALUES (?, ?, ?, ?, ?)",
        )
        .bind(&id)
        .bind(&dto.name)
        .bind(&dto.desc)
        .bind(&dto.url)
        .bind(&dto.service_id)
        .execute(self.db)
        .await
        .map_err(|e| e.to_string())?;

        Ok(id)
    }

    async fn update(&self, dto: &UpdateDocWebsocketDTO) -> Result<(), String> {
        sqlx::query("UPDATE doc_websockets SET name = ?, desc = ?, url = ? WHERE id = ?")
            .bind(&dto.name)
            .bind(&dto.desc)
            .bind(&dto.url)
            .bind(&dto.id)
            .execute(self.db)
            .await
            .map_err(|e| e.to_string())?;

        Ok(())
    }

    async fn delete(&self, id: &str) -> Result<(), String> {
        sqlx::query("DELETE FROM doc_websockets WHERE id = ?")
            .bind(id)
            .execute(self.db)
            .await
            .map_err(|e| e.to_string())?;

        Ok(())
    }
}
