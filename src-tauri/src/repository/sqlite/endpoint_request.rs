use crate::domain::doc_api::endpoint_request::dto::SaveEndpointRequestDTO;
use crate::domain::doc_api::endpoint_request::entity::{
    BodyMode, EndpointRequest, ParamValue, RequestHeader,
};
use crate::domain::doc_api::endpoint_request::repository::EndpointRequestRepository;
use sqlx::{Row, SqlitePool};
use uuid::Uuid;

pub struct EndpointRequestRepo<'a> {
    pub db: &'a SqlitePool,
}

impl<'a> EndpointRequestRepo<'a> {
    pub fn new(db: &'a SqlitePool) -> Self {
        Self { db }
    }
}

impl EndpointRequestRepository for EndpointRequestRepo<'_> {
    async fn list(&self, endpoint_id: &str) -> Result<Vec<EndpointRequest>, String> {
        let req_rows = sqlx::query(
            "SELECT id, endpoint_id, name, sort_ord, body_mode, raw_body FROM endpoint_requests \
             WHERE endpoint_id = ? ORDER BY sort_ord, created_at",
        )
        .bind(endpoint_id)
        .fetch_all(self.db)
        .await
        .map_err(|e| e.to_string())?;

        let request_ids: Vec<String> = req_rows.iter().map(|r| r.get("id")).collect();
        if request_ids.is_empty() {
            return Ok(Vec::new());
        }

        let val_rows = fetch_in(
            self.db,
            "SELECT request_id, kind, name, value FROM request_param_values WHERE request_id IN (",
            &request_ids,
            "",
        )
        .await?;

        let header_rows = fetch_in(
            self.db,
            "SELECT request_id, name, value, enabled FROM request_headers WHERE request_id IN (",
            &request_ids,
            " ORDER BY sort_ord",
        )
        .await?;

        let requests = req_rows
            .iter()
            .map(|r| {
                let id: String = r.get("id");
                let is_mine = |row: &&sqlx::sqlite::SqliteRow| row.get::<String, _>("request_id") == id;

                let headers = header_rows
                    .iter()
                    .filter(is_mine)
                    .map(|row| RequestHeader {
                        name: row.get("name"),
                        value: row.get("value"),
                        enabled: row.get::<i64, _>("enabled") != 0,
                    })
                    .collect();

                let values = val_rows
                    .iter()
                    .filter(is_mine)
                    .map(|row| ParamValue {
                        kind: row.get("kind"),
                        name: row.get("name"),
                        value: row.get("value"),
                    })
                    .collect();

                EndpointRequest {
                    id,
                    endpoint_id: r.get("endpoint_id"),
                    name: r.get("name"),
                    sort_ord: r.get("sort_ord"),
                    body_mode: BodyMode::parse(r.get::<String, _>("body_mode").as_str()),
                    raw_body: r.get("raw_body"),
                    headers,
                    values,
                }
            })
            .collect();

        Ok(requests)
    }

    async fn create(&self, endpoint_id: &str, name: &str) -> Result<EndpointRequest, String> {
        let id = Uuid::new_v4().to_string();
        let sort_ord: i64 =
            sqlx::query_scalar("SELECT COUNT(*) FROM endpoint_requests WHERE endpoint_id = ?")
                .bind(endpoint_id)
                .fetch_one(self.db)
                .await
                .map_err(|e| e.to_string())?;

        sqlx::query(
            "INSERT INTO endpoint_requests (id, endpoint_id, name, sort_ord) VALUES (?, ?, ?, ?)",
        )
        .bind(&id)
        .bind(endpoint_id)
        .bind(name)
        .bind(sort_ord)
        .execute(self.db)
        .await
        .map_err(|e| e.to_string())?;

        Ok(EndpointRequest {
            id,
            endpoint_id: endpoint_id.to_string(),
            name: name.to_string(),
            sort_ord,
            body_mode: BodyMode::Fields,
            raw_body: String::new(),
            headers: Vec::new(),
            values: Vec::new(),
        })
    }

    async fn delete(&self, id: &str) -> Result<(), String> {
        // ON DELETE CASCADE требует включённых внешних ключей.
        sqlx::query("PRAGMA foreign_keys = ON")
            .execute(self.db)
            .await
            .map_err(|e| e.to_string())?;
        sqlx::query("DELETE FROM endpoint_requests WHERE id = ?")
            .bind(id)
            .execute(self.db)
            .await
            .map_err(|e| e.to_string())?;
        Ok(())
    }

    /// Заголовки и значения правятся целиком, поэтому пересоздаём их —
    /// так состояние в БД всегда ровно то, что видит пользователь.
    async fn save(&self, request: &SaveEndpointRequestDTO) -> Result<(), String> {
        let mut tx = self.db.begin().await.map_err(|e| e.to_string())?;

        sqlx::query(
            "UPDATE endpoint_requests SET name = ?, body_mode = ?, raw_body = ? WHERE id = ?",
        )
        .bind(&request.name)
        .bind(request.body_mode.as_str())
        .bind(&request.raw_body)
        .bind(&request.id)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

        sqlx::query("DELETE FROM request_param_values WHERE request_id = ?")
            .bind(&request.id)
            .execute(&mut *tx)
            .await
            .map_err(|e| e.to_string())?;

        // Пустые значения не храним, чтобы не копить мусор.
        for value in request.values.iter().filter(|v| !v.value.is_empty()) {
            sqlx::query(
                "INSERT INTO request_param_values (request_id, kind, name, value) \
                 VALUES (?, ?, ?, ?)",
            )
            .bind(&request.id)
            .bind(&value.kind)
            .bind(&value.name)
            .bind(&value.value)
            .execute(&mut *tx)
            .await
            .map_err(|e| e.to_string())?;
        }

        sqlx::query("DELETE FROM request_headers WHERE request_id = ?")
            .bind(&request.id)
            .execute(&mut *tx)
            .await
            .map_err(|e| e.to_string())?;

        for (ord, header) in request.headers.iter().enumerate() {
            sqlx::query(
                "INSERT INTO request_headers (id, request_id, name, value, enabled, sort_ord) \
                 VALUES (?, ?, ?, ?, ?, ?)",
            )
            .bind(Uuid::new_v4().to_string())
            .bind(&request.id)
            .bind(&header.name)
            .bind(&header.value)
            .bind(if header.enabled { 1i64 } else { 0i64 })
            .bind(ord as i64)
            .execute(&mut *tx)
            .await
            .map_err(|e| e.to_string())?;
        }

        tx.commit().await.map_err(|e| e.to_string())?;
        Ok(())
    }
}

/// `SELECT ... WHERE request_id IN (<ids>)<suffix>` — sqlx не умеет биндить
/// список, поэтому плейсхолдеры собираются вручную.
async fn fetch_in(
    db: &SqlitePool,
    prefix: &str,
    ids: &[String],
    suffix: &str,
) -> Result<Vec<sqlx::sqlite::SqliteRow>, String> {
    let mut qb = sqlx::QueryBuilder::new(prefix);
    let mut sep = qb.separated(", ");
    for id in ids {
        sep.push_bind(id);
    }
    qb.push(")");
    qb.push(suffix);
    qb.build().fetch_all(db).await.map_err(|e| e.to_string())
}
