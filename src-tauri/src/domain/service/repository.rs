use super::model::{Service};
use super::dto::{CreateServiceDTO, UpdateServiceDTO};
use crate::domain::doc::model::Doca;
use sqlx::{Row, SqlitePool};
use uuid::Uuid;

pub trait ServiceRepository {
    async fn all(&self) -> Result<Vec<Service>, String>;
    async fn find_by_id(&self, id: &str) -> Result<Option<Service>, String>;
    async fn by_platform(&self, platform_id: &str) -> Result<Vec<Service>, String>;
    async fn create(&self, service: &CreateServiceDTO) -> Result<Service, String>;
    async fn update(&self, service: &UpdateServiceDTO) -> Result<(), String>;
    async fn delete(&self, id: &str) -> Result<(), String>;
    async fn attach_doc(&self, service_id: &str, doc_id: &str) -> Result<(), String>;
    async fn docs_by_service(&self, service_id: &str) -> Result<Vec<Doca>, String>;
}

pub struct ServiceRepo<'a> {
    pub db: &'a SqlitePool,
}

impl<'a> ServiceRepo<'a> {
    pub fn new(db: &'a SqlitePool) -> Self {
        Self { db }
    }
}

impl ServiceRepository for ServiceRepo<'_> {
    async fn all(&self) -> Result<Vec<Service>, String> {
        let rows = sqlx::query("SELECT id, name, desc, platform_id FROM services ORDER BY name")
            .fetch_all(self.db)
            .await
            .map_err(|e| e.to_string())?;

        Ok(rows
            .iter()
            .map(|r| Service {
                id: r.get("id"),
                name: r.get("name"),
                desc: r.get("desc"),
                platform_id: r.get("platform_id"),
            })
            .collect())
    }

    async fn find_by_id(&self, id: &str) -> Result<Option<Service>, String> {
        let row = sqlx::query("SELECT id, name, desc, platform_id FROM services WHERE id = ?")
            .bind(id)
            .fetch_optional(self.db)
            .await
            .map_err(|e| e.to_string())?;

        Ok(row.map(|r| Service {
            id: r.get("id"),
            name: r.get("name"),
            desc: r.get("desc"),
            platform_id: r.get("platform_id"),
        }))
    }

    async fn by_platform(&self, platform_id: &str) -> Result<Vec<Service>, String> {
        let rows = sqlx::query(
            "SELECT id, name, desc, platform_id FROM services WHERE platform_id = ? ORDER BY name",
        )
        .bind(platform_id)
        .fetch_all(self.db)
        .await
        .map_err(|e| e.to_string())?;

        Ok(rows
            .iter()
            .map(|r| Service {
                id: r.get("id"),
                name: r.get("name"),
                desc: r.get("desc"),
                platform_id: r.get("platform_id"),
            })
            .collect())
    }

    async fn create(&self, service: &CreateServiceDTO) -> Result<Service, String> {
        let id = Uuid::new_v4().to_string();

        sqlx::query("INSERT INTO services (id, name, desc, platform_id) VALUES (?, ?, ?, ?)")
            .bind(&id)
            .bind(&service.name)
            .bind(&service.desc)
            .bind(&service.platform_id)
            .execute(self.db)
            .await
            .map_err(|e| e.to_string())?;

        Ok(Service {
            id,
            name: service.name.clone(),
            desc: service.desc.clone(),
            platform_id: service.platform_id.clone(),
        })
    }

    async fn update(&self, service: &UpdateServiceDTO) -> Result<(), String> {
        sqlx::query("UPDATE services SET name = ?, desc = ?, platform_id = ? WHERE id = ?")
            .bind(&service.name)
            .bind(&service.desc)
            .bind(&service.platform_id)
            .bind(&service.id)
            .execute(self.db)
            .await
            .map_err(|e| e.to_string())?;

        Ok(())
    }

    async fn delete(&self, id: &str) -> Result<(), String> {
        sqlx::query("DELETE FROM services WHERE id = ?")
            .bind(id)
            .execute(self.db)
            .await
            .map_err(|e| e.to_string())?;

        Ok(())
    }

    // Links a doc to a service via the docs.service_id FK (migration 0014).
    async fn attach_doc(&self, service_id: &str, doc_id: &str) -> Result<(), String> {
        sqlx::query("UPDATE docs SET service_id = ? WHERE id = ?")
            .bind(service_id)
            .bind(doc_id)
            .execute(self.db)
            .await
            .map_err(|e| e.to_string())?;

        Ok(())
    }

    // Docs attached to a single service (docs.service_id), with their tags.
    async fn docs_by_service(&self, service_id: &str) -> Result<Vec<Doca>, String> {
        let rows = sqlx::query("SELECT * FROM docs WHERE service_id = ?")
            .bind(service_id)
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
}
