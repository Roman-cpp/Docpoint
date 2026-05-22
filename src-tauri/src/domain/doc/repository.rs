use super::model::{CreateDocDTO, Doca};
use sqlx::{Row, SqlitePool};
use uuid::Uuid;

pub trait DocRepository {
    async fn all(&self) -> Result<Vec<Doca>, String>;
    async fn find(&self, id: &str) -> Result<Option<Doca>, String>;
    async fn create(&self, doc: &CreateDocDTO) -> Result<String, String>;
    async fn delete(&self, id: &str) -> Result<(), String>;
}

pub struct DocRepo<'a> {
    pub db: &'a SqlitePool,
}

impl<'a> DocRepo<'a> {
    pub fn new(db: &'a SqlitePool) -> Self {
        Self { db }
    }
}

impl DocRepository for DocRepo<'_> {
    async fn all(&self) -> Result<Vec<Doca>, String> {
        let rows = sqlx::query("SELECT * FROM docs")
            .fetch_all(self.db)
            .await
            .map_err(|e| e.to_string())?;

        if rows.is_empty() {
            return Ok(vec![]);
        }

        let ids: Vec<String> = rows.iter().map(|r| r.get("id")).collect();

        let mut tq = sqlx::QueryBuilder::new("SELECT * FROM docs_tag WHERE doc_id IN (");
        let mut sep = tq.separated(",");
        for id in &ids {
            sep.push_bind(id);
        }
        tq.push(")");

        let tag_rows = tq
            .build()
            .fetch_all(self.db)
            .await
            .map_err(|e| e.to_string())?;

        Ok(rows
            .iter()
            .map(|r| {
                let id: String = r.get("id");
                let tags: Vec<String> = tag_rows
                    .iter()
                    .filter(|t| t.get::<String, _>("doc_id") == id)
                    .map(|t| t.get("tag"))
                    .collect();
                Doca {
                    id,
                    name: r.get("name"),
                    version: r.get("version"),
                    desc: r.get("desc"),
                    tags,
                }
            })
            .collect())
    }

    async fn find(&self, id: &str) -> Result<Option<Doca>, String> {
        let row = sqlx::query("SELECT * FROM docs WHERE id = ?")
            .bind(id)
            .fetch_optional(self.db)
            .await
            .map_err(|e| e.to_string())?;

        let Some(row) = row else {
            return Ok(None);
        };

        let tag_rows = sqlx::query("SELECT tag FROM docs_tag WHERE doc_id = ?")
            .bind(id)
            .fetch_all(self.db)
            .await
            .map_err(|e| e.to_string())?;

        Ok(Some(Doca {
            id: row.get("id"),
            name: row.get("name"),
            version: row.get("version"),
            desc: row.get("desc"),
            tags: tag_rows.iter().map(|r| r.get::<String, _>("tag")).collect(),
        }))
    }

    async fn create(&self, doc: &CreateDocDTO) -> Result<String, String> {
        let id = Uuid::new_v4().to_string();

        sqlx::query("INSERT INTO docs (id, name, version, desc) VALUES (?, ?, ?, ?)")
            .bind(&id)
            .bind(&doc.name)
            .bind(&doc.version)
            .bind(&doc.desc)
            .execute(self.db)
            .await
            .map_err(|e| e.to_string())?;

        for tag in &doc.tags {
            sqlx::query("INSERT INTO docs_tag (doc_id, tag) VALUES (?, ?)")
                .bind(&id)
                .bind(tag)
                .execute(self.db)
                .await
                .map_err(|e| e.to_string())?;
        }

        Ok(id)
    }

    async fn delete(&self, id: &str) -> Result<(), String> {
        let mut conn = self.db.acquire().await.map_err(|e| e.to_string())?;

        sqlx::query("PRAGMA foreign_keys = ON")
            .execute(&mut *conn)
            .await
            .map_err(|e| e.to_string())?;

        sqlx::query("DELETE FROM docs WHERE id = ?")
            .bind(id)
            .execute(&mut *conn)
            .await
            .map_err(|e| e.to_string())?;

        Ok(())
    }
}
