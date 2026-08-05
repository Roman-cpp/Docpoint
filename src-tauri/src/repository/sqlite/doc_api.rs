use crate::domain::{
    doc_api::doc_api::dto::UpdateDocApiDTO,
    environment::environment::entity::{EnvValue, Environment},
};

use crate::domain::doc_api::doc_api::dto::CreateDocApiDTO;
use crate::domain::doc_api::doc_api::entity::DocApi;
use sqlx::{Row, SqlitePool};
use uuid::Uuid;
use crate::domain::doc_api::doc_api::repository::DocRepository;

pub struct DocRepo<'a> {
    pub db: &'a SqlitePool,
}

impl<'a> DocRepo<'a> {
    pub fn new(db: &'a SqlitePool) -> Self {
        Self { db }
    }
}

impl DocRepository for DocRepo<'_> {
    async fn all(&self) -> Result<Vec<DocApi>, String> {
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
                DocApi {
                    id,
                    name: r.get("name"),
                    version: r.get("version"),
                    desc: r.get("desc"),
                    prefix: r.get("prefix"),
                    tags,
                }
            })
            .collect())
    }

    async fn find(&self, id: &str) -> Result<Option<DocApi>, String> {
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

        Ok(Some(DocApi {
            id: row.get("id"),
            name: row.get("name"),
            version: row.get("version"),
            desc: row.get("desc"),
            prefix: row.get("prefix"),
            tags: tag_rows.iter().map(|r| r.get::<String, _>("tag")).collect(),
        }))
    }

    async fn create(&self, doc: &CreateDocApiDTO) -> Result<String, String> {
        let id = Uuid::new_v4().to_string();

        sqlx::query("INSERT INTO docs (id, name, version, desc, prefix) VALUES (?, ?, ?, ?, ?)")
            .bind(&id)
            .bind(&doc.name)
            .bind(&doc.version)
            .bind(&doc.desc)
            .bind(&doc.prefix)
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

    async fn update(&self, doc: &UpdateDocApiDTO) -> Result<String, String> {
        sqlx::query("UPDATE docs SET name = ?, desc = ?, prefix = ? WHERE id = ?")
            .bind(&doc.name)
            .bind(&doc.desc)
            .bind(&doc.prefix)
            .bind(&doc.id)
            .execute(self.db)
            .await
            .map_err(|e| e.to_string())?;

        sqlx::query("DELETE FROM docs_tag WHERE doc_id = ?")
            .bind(&doc.id)
            .execute(self.db)
            .await
            .map_err(|e| e.to_string())?;

        for tag in &doc.tags {
            sqlx::query("INSERT INTO docs_tag (doc_id, tag) VALUES (?, ?)")
                .bind(&doc.id)
                .bind(tag)
                .execute(self.db)
                .await
                .map_err(|e| e.to_string())?;
        }

        Ok(doc.id.clone())
    }

    async fn delete(&self, id: &str) -> Result<(), String> {
        let mut conn = self.db.acquire().await.map_err(|e| e.to_string())?;

        sqlx::query("PRAGMA foreign_keys = ON")
            .execute(&mut *conn)
            .await
            .map_err(|e| e.to_string())?;

        // Environments are owned by platforms, not docs, so deleting a doc does not
        // touch them (docs.domain_id is ON DELETE SET NULL on the domain side).
        sqlx::query("DELETE FROM docs WHERE id = ?")
            .bind(id)
            .execute(&mut *conn)
            .await
            .map_err(|e| e.to_string())?;

        Ok(())
    }

    async fn environments_by_doc(&self, doc_id: &str) -> Result<Vec<Environment>, String> {
        // A doc's environments are those of the platform owning the domain it
        // belongs to (docs.domain_id -> domains.platform_id). Docs with no
        // domain, or a domain with no platform, have none.
        let rows = sqlx::query(
            "SELECT * FROM environments WHERE platform_id = (\
                 SELECT platform_id FROM domains \
                 WHERE id = (SELECT domain_id FROM docs WHERE id = ?))",
        )
        .bind(doc_id)
        .fetch_all(self.db)
        .await
        .map_err(|e| e.to_string())?;

        let mut environments = Vec::new();
        for row in rows.iter() {
            let id: String = row.get("id");
            let var_rows =
                sqlx::query("SELECT id, key, value FROM variables WHERE environments_id = ?")
                    .bind(&id)
                    .fetch_all(self.db)
                    .await
                    .map_err(|e| e.to_string())?;

            environments.push(Environment {
                id,
                env: row.get("env"),
                label: row.get("label"),
                base_url: row.get("base_url"),
                prefix: row.get("prefix"),
                value: var_rows
                    .iter()
                    .map(|v| EnvValue {
                        id: v.get("id"),
                        name: v.get("key"),
                        value: v.get("value"),
                    })
                    .collect(),
                access_token: "".to_string(),
            });
        }

        Ok(environments)
    }
}
