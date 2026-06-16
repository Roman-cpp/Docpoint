use super::model::{EndpointRequest, ParamValue};
use sqlx::{Row, SqlitePool};
use uuid::Uuid;

pub struct EndpointRequestRepo<'a> {
    pub db: &'a SqlitePool,
}

impl<'a> EndpointRequestRepo<'a> {
    pub fn new(db: &'a SqlitePool) -> Self {
        Self { db }
    }

    /// Все наборы эндпоинта вместе с их значениями, в порядке sort_ord.
    pub async fn list(&self, endpoint_id: &str) -> Result<Vec<EndpointRequest>, String> {
        let req_rows = sqlx::query(
            "SELECT id, endpoint_id, name, sort_ord FROM endpoint_requests \
             WHERE endpoint_id = ? ORDER BY sort_ord, created_at",
        )
        .bind(endpoint_id)
        .fetch_all(self.db)
        .await
        .map_err(|e| e.to_string())?;

        let request_ids: Vec<String> = req_rows.iter().map(|r| r.get("id")).collect();

        let val_rows = if request_ids.is_empty() {
            Vec::new()
        } else {
            let mut qb =
                sqlx::QueryBuilder::new("SELECT request_id, kind, name, value FROM request_param_values WHERE request_id IN (");
            let mut sep = qb.separated(", ");
            for id in &request_ids {
                sep.push_bind(id);
            }
            qb.push(")");
            qb.build()
                .fetch_all(self.db)
                .await
                .map_err(|e| e.to_string())?
        };

        let requests = req_rows
            .iter()
            .map(|r| {
                let id: String = r.get("id");
                let values: Vec<ParamValue> = val_rows
                    .iter()
                    .filter(|v| v.get::<String, _>("request_id") == id)
                    .map(|v| ParamValue {
                        kind: v.get("kind"),
                        name: v.get("name"),
                        value: v.get("value"),
                    })
                    .collect();
                EndpointRequest {
                    id,
                    endpoint_id: r.get("endpoint_id"),
                    name: r.get("name"),
                    sort_ord: r.get("sort_ord"),
                    values,
                }
            })
            .collect();

        Ok(requests)
    }

    pub async fn create(
        &self,
        endpoint_id: &str,
        name: &str,
    ) -> Result<EndpointRequest, String> {
        let id = Uuid::new_v4().to_string();
        let sort_ord: i64 = sqlx::query_scalar(
            "SELECT COUNT(*) FROM endpoint_requests WHERE endpoint_id = ?",
        )
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
            values: Vec::new(),
        })
    }

    pub async fn rename(&self, id: &str, name: &str) -> Result<(), String> {
        sqlx::query("UPDATE endpoint_requests SET name = ? WHERE id = ?")
            .bind(name)
            .bind(id)
            .execute(self.db)
            .await
            .map_err(|e| e.to_string())?;
        Ok(())
    }

    pub async fn delete(&self, id: &str) -> Result<(), String> {
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

    /// Устанавливает значение параметра в наборе. Пустое значение удаляет
    /// строку, чтобы не копить мусор.
    pub async fn set_value(
        &self,
        request_id: &str,
        kind: &str,
        name: &str,
        value: &str,
    ) -> Result<(), String> {
        if value.is_empty() {
            sqlx::query(
                "DELETE FROM request_param_values WHERE request_id = ? AND kind = ? AND name = ?",
            )
            .bind(request_id)
            .bind(kind)
            .bind(name)
            .execute(self.db)
            .await
            .map_err(|e| e.to_string())?;
            return Ok(());
        }

        sqlx::query(
            "INSERT INTO request_param_values (request_id, kind, name, value) VALUES (?, ?, ?, ?) \
             ON CONFLICT(request_id, kind, name) DO UPDATE SET value = excluded.value",
        )
        .bind(request_id)
        .bind(kind)
        .bind(name)
        .bind(value)
        .execute(self.db)
        .await
        .map_err(|e| e.to_string())?;
        Ok(())
    }
}
