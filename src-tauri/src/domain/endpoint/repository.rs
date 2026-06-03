use super::model::CreateEndpointDTO;
use sqlx::{SqlitePool};
use uuid::Uuid;

pub struct EndpointRepo<'a> {
    pub db: &'a SqlitePool,
}

impl<'a> EndpointRepo<'a> {
    pub fn new(db: &'a SqlitePool) -> Self {
        Self { db }
    }

    pub async fn create(&self, group_id: &str, endpoint: &CreateEndpointDTO) -> Result<(), String> {
        let db = self.db;

        let endpoint_id = Uuid::new_v4().to_string();

        let sort_ord: i64 =
            sqlx::query_scalar("SELECT COUNT(*) FROM endpoint WHERE group_id = ?")
                .bind(group_id)
                .fetch_one(self.db)
                .await
                .map_err(|e| e.to_string())?;

        sqlx::query(
            "INSERT INTO endpoint (id, group_id, method, path, name, description, auth, sort_ord) \
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        )
        .bind(&endpoint_id)
        .bind(group_id)
        .bind(&endpoint.method)
        .bind(&endpoint.path)
        .bind(&endpoint.name)
        .bind(&endpoint.description)
        .bind(if endpoint.auth { 1i64 } else { 0i64 })
        .bind(sort_ord as i64)
        .execute(db)
        .await
        .map_err(|e| e.to_string())?;

        for tag in &endpoint.tags {
            sqlx::query("INSERT INTO endpoint_tag (endpoint_id, tag) VALUES (?, ?)")
                .bind(&endpoint_id)
                .bind(tag)
                .execute(db)
                .await
                .map_err(|e| e.to_string())?;
        }

        for (pi, param) in endpoint.query_params.iter().enumerate() {
            sqlx::query(
                "INSERT INTO param (endpoint_id, kind, name, type, required, desc, default_val, sort_ord) \
                 VALUES (?, 'query', ?, ?, ?, ?, ?, ?)",
            )
            .bind(&endpoint_id)
            .bind(&param.name)
            .bind(&param.type_)
            .bind(if param.required { 1i64 } else { 0i64 })
            .bind(&param.desc)
            .bind(&param.default)
            .bind(pi as i64)
            .execute(db)
            .await
            .map_err(|e| e.to_string())?;
        }

        for (pi, param) in endpoint.body_params.iter().enumerate() {
            sqlx::query(
                "INSERT INTO param (endpoint_id, kind, name, type, required, desc, default_val, sort_ord) \
                 VALUES (?, 'body', ?, ?, ?, ?, ?, ?)",
            )
            .bind(&endpoint_id)
            .bind(&param.name)
            .bind(&param.type_)
            .bind(if param.required { 1i64 } else { 0i64 })
            .bind(&param.desc)
            .bind(&param.default)
            .bind(pi as i64)
            .execute(db)
            .await
            .map_err(|e| e.to_string())?;
        }

        for (status_code, resp) in &endpoint.responses {
            let result = sqlx::query(
                "INSERT INTO response (endpoint_id, status_code, label, example) \
                 VALUES (?, ?, ?, ?)",
            )
            .bind(&endpoint_id)
            .bind(status_code)
            .bind(&resp.label)
            .bind(&resp.example)
            .execute(db)
            .await
            .map_err(|e| e.to_string())?;

            let resp_id = result.last_insert_rowid();

            for (fi, field) in resp.schema.iter().enumerate() {
                sqlx::query(
                    "INSERT INTO response_field (response_id, key, type, desc, example, sort_ord) \
                     VALUES (?, ?, ?, ?, ?, ?)",
                )
                .bind(resp_id)
                .bind(&field.key)
                .bind(&field.type_)
                .bind(&field.desc)
                .bind(&field.example)
                .bind(fi as i64)
                .execute(db)
                .await
                .map_err(|e| e.to_string())?;
            }
        }

        Ok(())
    }
}
