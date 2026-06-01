use super::model::{CreatePlatformDTO, Platform, UpdatePlatformDTO};
use sqlx::{Row, SqlitePool};
use uuid::Uuid;

pub trait PlatformRepository {
    async fn all(&self) -> Result<Vec<Platform>, String>;
    async fn create(&self, platform: &CreatePlatformDTO) -> Result<Platform, String>;
    async fn update(&self, platform: &UpdatePlatformDTO) -> Result<(), String>;
    async fn delete(&self, id: &str) -> Result<(), String>;
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
        sqlx::query("DELETE FROM platforms WHERE id = ?")
            .bind(id)
            .execute(self.db)
            .await
            .map_err(|e| e.to_string())?;

        Ok(())
    }
}
