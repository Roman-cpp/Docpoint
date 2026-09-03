use crate::domain::websocket::doc_websocket::entity::DocWebsocket;
use crate::domain::websocket::doc_websocket::repository::DocWebsocketRepository;
use sqlx::{Row, SqlitePool, sqlite::SqliteRow};

/// Сокет склеен из узла дерева (имя) и своей строки в `doc_ws`.
const SELECT_WS: &str = "SELECT n.id, n.name, w.url \
                         FROM doc_ws w JOIN catalog_node n ON n.id = w.id";

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
        let rows = sqlx::query(&format!("{SELECT_WS} ORDER BY n.name"))
            .fetch_all(self.db)
            .await
            .map_err(|e| e.to_string())?;

        Ok(rows.iter().map(ws_from_row).collect())
    }

    async fn find(&self, id: &str) -> Result<Option<DocWebsocket>, String> {
        let row = sqlx::query(&format!("{SELECT_WS} WHERE n.id = ?"))
            .bind(id)
            .fetch_optional(self.db)
            .await
            .map_err(|e| e.to_string())?;

        Ok(row.as_ref().map(ws_from_row))
    }

    async fn create(&self, id: &str, url: &str) -> Result<(), String> {
        sqlx::query("INSERT INTO doc_ws (id, url) VALUES (?, ?)")
            .bind(id)
            .bind(url)
            .execute(self.db)
            .await
            .map_err(|e| e.to_string())?;

        Ok(())
    }

    async fn update(&self, id: &str, url: &str) -> Result<(), String> {
        sqlx::query("UPDATE doc_ws SET url = ? WHERE id = ?")
            .bind(url)
            .bind(id)
            .execute(self.db)
            .await
            .map_err(|e| e.to_string())?;

        Ok(())
    }
}

fn ws_from_row(row: &SqliteRow) -> DocWebsocket {
    DocWebsocket {
        id: row.get("id"),
        name: row.get("name"),
        url: row.get("url"),
    }
}
