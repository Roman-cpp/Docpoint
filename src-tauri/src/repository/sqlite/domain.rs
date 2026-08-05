use crate::domain::domain::entity::{Domain};
use crate::domain::domain::dto::{CreateDomainDTO, UpdateDomainDTO};
use crate::domain::doc_api::doc_api::entity::DocApi;
use sqlx::{Row, SqlitePool};
use uuid::Uuid;
use crate::domain::domain::repository::DomainRepository;

pub struct DomainRepo<'a> {
    pub db: &'a SqlitePool,
}

impl<'a> DomainRepo<'a> {
    pub fn new(db: &'a SqlitePool) -> Self {
        Self { db }
    }
}

impl DomainRepository for DomainRepo<'_> {
    async fn all(&self) -> Result<Vec<Domain>, String> {
        let rows = sqlx::query("SELECT id, name, desc, platform_id FROM domains ORDER BY name")
            .fetch_all(self.db)
            .await
            .map_err(|e| e.to_string())?;

        Ok(rows
            .iter()
            .map(|r| Domain {
                id: r.get("id"),
                name: r.get("name"),
                desc: r.get("desc"),
                platform_id: r.get("platform_id"),
            })
            .collect())
    }

    async fn find_by_id(&self, id: &str) -> Result<Option<Domain>, String> {
        let row = sqlx::query("SELECT id, name, desc, platform_id FROM domains WHERE id = ?")
            .bind(id)
            .fetch_optional(self.db)
            .await
            .map_err(|e| e.to_string())?;

        Ok(row.map(|r| Domain {
            id: r.get("id"),
            name: r.get("name"),
            desc: r.get("desc"),
            platform_id: r.get("platform_id"),
        }))
    }

    async fn by_platform(&self, platform_id: &str) -> Result<Vec<Domain>, String> {
        let rows = sqlx::query(
            "SELECT id, name, desc, platform_id FROM domains WHERE platform_id = ? ORDER BY name",
        )
        .bind(platform_id)
        .fetch_all(self.db)
        .await
        .map_err(|e| e.to_string())?;

        Ok(rows
            .iter()
            .map(|r| Domain {
                id: r.get("id"),
                name: r.get("name"),
                desc: r.get("desc"),
                platform_id: r.get("platform_id"),
            })
            .collect())
    }

    async fn create(&self, domain: &CreateDomainDTO) -> Result<Domain, String> {
        let id = Uuid::new_v4().to_string();

        sqlx::query("INSERT INTO domains (id, name, desc, platform_id) VALUES (?, ?, ?, ?)")
            .bind(&id)
            .bind(&domain.name)
            .bind(&domain.desc)
            .bind(&domain.platform_id)
            .execute(self.db)
            .await
            .map_err(|e| e.to_string())?;

        Ok(Domain {
            id,
            name: domain.name.clone(),
            desc: domain.desc.clone(),
            platform_id: domain.platform_id.clone(),
        })
    }

    async fn update(&self, domain: &UpdateDomainDTO) -> Result<(), String> {
        sqlx::query("UPDATE domains SET name = ?, desc = ?, platform_id = ? WHERE id = ?")
            .bind(&domain.name)
            .bind(&domain.desc)
            .bind(&domain.platform_id)
            .bind(&domain.id)
            .execute(self.db)
            .await
            .map_err(|e| e.to_string())?;

        Ok(())
    }

    async fn delete(&self, id: &str) -> Result<(), String> {
        sqlx::query("DELETE FROM domains WHERE id = ?")
            .bind(id)
            .execute(self.db)
            .await
            .map_err(|e| e.to_string())?;

        Ok(())
    }

    // Links a doc to a domain via the docs.domain_id FK (migration 0014).
    async fn attach_doc(&self, domain_id: &str, doc_id: &str) -> Result<(), String> {
        sqlx::query("UPDATE docs SET domain_id = ? WHERE id = ?")
            .bind(domain_id)
            .bind(doc_id)
            .execute(self.db)
            .await
            .map_err(|e| e.to_string())?;

        Ok(())
    }

    // Docs attached to a single domain (docs.domain_id), with their tags.
    async fn docs_by_domain(&self, domain_id: &str) -> Result<Vec<DocApi>, String> {
        let rows = sqlx::query("SELECT * FROM docs WHERE domain_id = ?")
            .bind(domain_id)
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
}
