use crate::domain::doc_api::doc_api::dto::DocApiPayload;
use crate::domain::doc_api::doc_api::entity::DocApi;
use crate::domain::doc_api::doc_api::repository::DocApiRepository;
use crate::domain::environment::environment::entity::{EnvValue, Environment};
use sqlx::{sqlite::SqliteRow, Row, SqlitePool};

/// Документ склеен из узла дерева (имя) и своей строки в `doc_api`.
const SELECT_DOC: &str = "SELECT n.id, n.name, d.prefix \
                          FROM doc_api d JOIN catalog_node n ON n.id = d.id";

pub struct DocApiRepo<'a> {
    pub db: &'a SqlitePool,
}

impl<'a> DocApiRepo<'a> {
    pub fn new(db: &'a SqlitePool) -> Self {
        Self { db }
    }
}

impl DocApiRepository for DocApiRepo<'_> {
    async fn all(&self) -> Result<Vec<DocApi>, String> {
        let rows = sqlx::query(&format!("{SELECT_DOC} ORDER BY n.name"))
            .fetch_all(self.db)
            .await
            .map_err(|e| e.to_string())?;

        Ok(rows.iter().map(doc_from_row).collect())
    }

    async fn find(&self, id: &str) -> Result<Option<DocApi>, String> {
        let row = sqlx::query(&format!("{SELECT_DOC} WHERE n.id = ?"))
            .bind(id)
            .fetch_optional(self.db)
            .await
            .map_err(|e| e.to_string())?;

        Ok(row.as_ref().map(doc_from_row))
    }

    async fn create(&self, id: &str, payload: &DocApiPayload) -> Result<(), String> {
        sqlx::query("INSERT INTO doc_api (id, prefix) VALUES (?, ?)")
            .bind(id)
            .bind(&payload.prefix)
            .execute(self.db)
            .await
            .map_err(|e| e.to_string())?;

        Ok(())
    }

    async fn update(&self, id: &str, payload: &DocApiPayload) -> Result<(), String> {
        sqlx::query("UPDATE doc_api SET prefix = ? WHERE id = ?")
            .bind(&payload.prefix)
            .bind(id)
            .execute(self.db)
            .await
            .map_err(|e| e.to_string())?;

        Ok(())
    }

    /// Окружения документа — это окружения платформы, в дереве которой он лежит
    /// (`catalog_node.platform_id`).
    async fn environments_by_doc(&self, doc_id: &str) -> Result<Vec<Environment>, String> {
        let rows = sqlx::query(
            "SELECT * FROM environments WHERE platform_id = \
                 (SELECT platform_id FROM catalog_node WHERE id = ?)",
        )
        .bind(doc_id)
        .fetch_all(self.db)
        .await
        .map_err(|e| e.to_string())?;

        let mut environments = Vec::new();
        for row in rows.iter() {
            let id: String = row.get("id");
            let var_rows = sqlx::query(
                "SELECT id, key, value, is_secret FROM variables WHERE environments_id = ?",
            )
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
                        is_secret: v.get::<i64, _>("is_secret") != 0,
                    })
                    .collect(),
                access_token: "".to_string(),
            });
        }

        Ok(environments)
    }
}

fn doc_from_row(row: &SqliteRow) -> DocApi {
    DocApi {
        id: row.get("id"),
        name: row.get("name"),
        prefix: row.get("prefix"),
    }
}
