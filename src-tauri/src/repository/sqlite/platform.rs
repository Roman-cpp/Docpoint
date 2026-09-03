use crate::domain::environment::environment::entity::{EnvValue, Environment};
use crate::domain::platform::dto::{CreatePlatformDTO, UpdatePlatformDTO};
use crate::domain::platform::entity::Platform;
use crate::domain::platform::repository::PlatformRepository;
use sqlx::{Row, SqlitePool};
use uuid::Uuid;

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

    async fn find_by_id(&self, id: &str) -> Result<Option<Platform>, String> {
        let row = sqlx::query("SELECT id, name, desc FROM platforms WHERE id = ?")
            .bind(id)
            .fetch_optional(self.db)
            .await
            .map_err(|e| e.to_string())?;

        Ok(row.map(|r| Platform {
            id: r.get("id"),
            name: r.get("name"),
            desc: r.get("desc"),
        }))
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
        // Remove this platform's environments explicitly (their variables/auth
        // cascade via FK from environments). The environments.platform_id FK also
        // cascades, but foreign_keys may be off on this connection, so don't rely
        // on it here.
        sqlx::query("DELETE FROM environments WHERE platform_id = ?")
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

    async fn environments_by_platform(
        &self,
        platform_id: &str,
    ) -> Result<Vec<Environment>, String> {
        let rows = sqlx::query("SELECT * FROM environments WHERE platform_id = ?")
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
