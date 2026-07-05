use crate::domain::websocket::message::dto::{
    CreateWebsocketMessageDTO, UpdateWebsocketMessageDTO,
};
use crate::domain::websocket::message::entity::WebsocketMessage;
use crate::domain::websocket::message::repository::WebsocketMessageRepository;
use sqlx::{Row, SqlitePool};
use uuid::Uuid;

pub struct WebsocketMessageRepo<'a> {
    pub db: &'a SqlitePool,
}

impl<'a> WebsocketMessageRepo<'a> {
    pub fn new(db: &'a SqlitePool) -> Self {
        Self { db }
    }
}

impl WebsocketMessageRepository for WebsocketMessageRepo<'_> {
    async fn by_websocket(&self, websocket_id: &str) -> Result<Vec<WebsocketMessage>, String> {
        let rows = sqlx::query(
            "SELECT id, websocket_id, name, payload, desc FROM websocket_message WHERE websocket_id = ? ORDER BY name",
        )
        .bind(websocket_id)
        .fetch_all(self.db)
        .await
        .map_err(|e| e.to_string())?;

        Ok(rows
            .iter()
            .map(|r| WebsocketMessage {
                id: r.get("id"),
                websocket_id: r.get("websocket_id"),
                name: r.get("name"),
                payload: r.get("payload"),
                desc: r.get("desc"),
            })
            .collect())
    }

    async fn create(&self, dto: &CreateWebsocketMessageDTO) -> Result<String, String> {
        let id = Uuid::new_v4().to_string();

        sqlx::query(
            "INSERT INTO websocket_message (id, websocket_id, name, payload, desc) VALUES (?, ?, ?, ?, ?)",
        )
        .bind(&id)
        .bind(&dto.websocket_id)
        .bind(&dto.name)
        .bind(&dto.payload)
        .bind(&dto.desc)
        .execute(self.db)
        .await
        .map_err(|e| e.to_string())?;

        Ok(id)
    }

    async fn update(&self, dto: &UpdateWebsocketMessageDTO) -> Result<(), String> {
        sqlx::query("UPDATE websocket_message SET name = ?, payload = ?, desc = ? WHERE id = ?")
            .bind(&dto.name)
            .bind(&dto.payload)
            .bind(&dto.desc)
            .bind(&dto.id)
            .execute(self.db)
            .await
            .map_err(|e| e.to_string())?;

        Ok(())
    }

    async fn delete(&self, id: &str) -> Result<(), String> {
        sqlx::query("DELETE FROM websocket_message WHERE id = ?")
            .bind(id)
            .execute(self.db)
            .await
            .map_err(|e| e.to_string())?;

        Ok(())
    }
}
