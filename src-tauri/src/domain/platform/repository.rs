use super::model::{CreatePlatformDTO, Platform, UpdatePlatformDTO};
use crate::domain::doc::model::Doca;
use crate::domain::environment::model::{EnvValue, Environment};
use sqlx::{Row, SqlitePool};
use uuid::Uuid;

pub trait PlatformRepository {
    async fn all(&self) -> Result<Vec<Platform>, String>;
    async fn create(&self, platform: &CreatePlatformDTO) -> Result<Platform, String>;
    async fn update(&self, platform: &UpdatePlatformDTO) -> Result<(), String>;
    async fn delete(&self, id: &str) -> Result<(), String>;
    async fn attach_doc(&self, platform_id: &str, doc_id: &str) -> Result<(), String>;
    async fn docs_by_platform(&self, platform_id: &str) -> Result<Vec<Doca>, String>;
    async fn environments_by_platform(
        &self,
        platform_id: &str,
    ) -> Result<Vec<Environment>, String>;
}

pub struct PlatformRepo<'a> {
    pub db: &'a SqlitePool,
}

impl<'a> PlatformRepo<'a> {
    pub fn new(db: &'a SqlitePool) -> Self {
        Self { db }
    }
}

impl PlatformRepository for PlatformRepo<'_> {
    async fn all(&self) -> Result<Vec<Platform>, String> {
        let rows = sqlx::query("SELECT id, name, desc FROM platforms ORDER BY name")
            .fetch_all(self.db)
            .await
            .map_err(|e| e.to_string())?;

        Ok(rows
            .iter()
            .map(|r| Platform {
                id: r.get("id"),
                name: r.get("name"),
                desc: r.get("desc"),
            })
            .collect())
    }

    async fn create(&self, platform: &CreatePlatformDTO) -> Result<Platform, String> {
        let id = Uuid::new_v4().to_string();

        sqlx::query("INSERT INTO platforms (id, name, desc) VALUES (?, ?, ?)")
            .bind(&id)
            .bind(&platform.name)
            .bind(&platform.desc)
            .execute(self.db)
            .await
            .map_err(|e| e.to_string())?;

        Ok(Platform {
            id,
            name: platform.name.clone(),
            desc: platform.desc.clone(),
        })
    }

    async fn update(&self, platform: &UpdatePlatformDTO) -> Result<(), String> {
        sqlx::query("UPDATE platforms SET name = ?, desc = ? WHERE id = ?")
            .bind(&platform.name)
            .bind(&platform.desc)
            .bind(&platform.id)
            .execute(self.db)
            .await
            .map_err(|e| e.to_string())?;

        Ok(())
    }

    async fn delete(&self, id: &str) -> Result<(), String> {
        // Environments owned by this platform have no FK back to platforms
        // (polymorphic environmentable_id/type), so remove them explicitly.
        // Their variables/auth still cascade via FK from environments.
        sqlx::query(
            "DELETE FROM environments WHERE environmentable_id = ? AND environmentable_type = 'platform'",
        )
        .bind(id)
        .execute(self.db)
        .await
        .map_err(|e| e.to_string())?;

        sqlx::query("DELETE FROM platforms WHERE id = ?")
            .bind(id)
            .execute(self.db)
            .await
            .map_err(|e| e.to_string())?;

        Ok(())
    }

    // Links a doc to a platform via the docs.platform_id FK (migration 0011).
    async fn attach_doc(&self, platform_id: &str, doc_id: &str) -> Result<(), String> {
        sqlx::query("UPDATE docs SET platform_id = ? WHERE id = ?")
            .bind(platform_id)
            .bind(doc_id)
            .execute(self.db)
            .await
            .map_err(|e| e.to_string())?;

        Ok(())
    }

    async fn docs_by_platform(&self, platform_id: &str) -> Result<Vec<Doca>, String> {
        let rows = sqlx::query("SELECT * FROM docs WHERE platform_id = ?")
            .bind(platform_id)
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

    async fn environments_by_platform(
        &self,
        platform_id: &str,
    ) -> Result<Vec<Environment>, String> {
        let rows = sqlx::query(
            "SELECT * FROM environments WHERE environmentable_id = ? AND environmentable_type = 'platform'",
        )
            .bind(platform_id)
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
