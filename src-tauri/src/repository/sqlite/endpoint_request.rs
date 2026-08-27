use crate::domain::doc_api::endpoint_request::dto::{ImportEndpointRequestDTO, SaveEndpointRequestDTO};
use crate::domain::doc_api::endpoint_request::entity::{
    BodyMode, EndpointRequest, ParamValue, RequestHeader,
};
use crate::domain::doc_api::endpoint_request::repository::{
    EndpointRequestRepository, RequestTarget,
};
use sqlx::{Row, SqlitePool};
use std::collections::HashMap;
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
            "SELECT id, endpoint_id, name, sort_ord, body_mode, body FROM endpoint_requests \
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
                    body: r.get("body"),
                    headers,
                    values,
                }
            })
            .collect();

        Ok(requests)
    }

    async fn insert(
        &self,
        target: &RequestTarget<'_>,
        sort_ord: i64,
        request: &ImportEndpointRequestDTO,
    ) -> Result<(), String> {
        // Кривой `kind` уронил бы вставку на CHECK-констрейнте таблицы с
        // невнятным текстом от SQLite — проверяем заранее, до записи.
        for value in &request.values {
            if value.kind == "body" {
                return Err(format!(
                    "набор {:?}: тело задаётся полем \"body\", а не значением с kind: \"body\"",
                    request.name
                ));
            }
            if !matches!(value.kind.as_str(), "path" | "query") {
                return Err(format!(
                    "неизвестный вид параметра {:?} в наборе {:?}",
                    value.kind, request.name
                ));
            }
        }

        // Пустые значения не храним — как и `save`, иначе состояние после
        // импорта разъезжалось бы с тем, что видно в панели. Дубликаты по
        // (kind, name) запрещены первичным ключом; на импорте побеждает
        // последний, вместо того чтобы ронять весь файл. Устаревший
        // `values[]` кладём первым, чтобы явные карты его перекрывали.
        let mut values: HashMap<(&str, &str), &str> = HashMap::new();
        for value in request.values.iter().filter(|v| !v.value.is_empty()) {
            values.insert((&value.kind, &value.name), &value.value);
        }
        for (name, value) in request.path.iter().filter(|(_, v)| !v.is_empty()) {
            values.insert(("path", name), value);
        }
        for (name, value) in request.query.iter().filter(|(_, v)| !v.is_empty()) {
            values.insert(("query", name), value);
        }

        // Значение с чужим именем никуда не подставится: сегменты берутся из
        // пути, а query — из схемы эндпоинта. Молча сохранить его — значит
        // спрятать опечатку до первой отправки запроса.
        let path_params = target.path_params();
        for (kind, name) in values.keys() {
            let known = match *kind {
                "path" => path_params.contains(name),
                _ => target.query_names.contains(name),
            };
            if !known {
                return Err(match *kind {
                    "path" => format!(
                        "набор {:?}: в пути {} нет сегмента {name:?}",
                        request.name, target.path
                    ),
                    _ => format!(
                        "набор {:?}: параметр {name:?} не описан в queryParams эндпоинта {}",
                        request.name, target.path
                    ),
                });
            }
        }

        let id = Uuid::new_v4().to_string();
        let mut tx = self.db.begin().await.map_err(|e| e.to_string())?;

        sqlx::query(
            "INSERT INTO endpoint_requests (id, endpoint_id, name, sort_ord, body_mode, body) \
             VALUES (?, ?, ?, ?, ?, ?)",
        )
        .bind(&id)
        .bind(target.endpoint_id)
        .bind(&request.name)
        .bind(sort_ord)
        .bind(request.body_mode.as_str())
        .bind(&request.body)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

        for ((kind, name), value) in &values {
            sqlx::query(
                "INSERT INTO request_param_values (request_id, kind, name, value) \
                 VALUES (?, ?, ?, ?)",
            )
            .bind(&id)
            .bind(kind)
            .bind(name)
            .bind(value)
            .execute(&mut *tx)
            .await
            .map_err(|e| e.to_string())?;
        }

        for (ord, header) in request.headers.iter().enumerate() {
            sqlx::query(
                "INSERT INTO request_headers (id, request_id, name, value, enabled, sort_ord) \
                 VALUES (?, ?, ?, ?, ?, ?)",
            )
            .bind(Uuid::new_v4().to_string())
            .bind(&id)
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
            body: String::new(),
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
            "UPDATE endpoint_requests SET name = ?, body_mode = ?, body = ? WHERE id = ?",
        )
        .bind(&request.name)
        .bind(request.body_mode.as_str())
        .bind(&request.body)
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

#[cfg(test)]
mod tests {
    use super::*;
    use crate::repository::sqlite::test_db;
    use sqlx::Executor;

    /// Полная схема и один эндпоинт `e1`, на который наборы ссылаются
    /// внешним ключом.
    async fn seeded() -> SqlitePool {
        let pool = test_db::migrated().await;

        pool.execute(sqlx::raw_sql(
            r#"
            INSERT INTO platforms (id,name) VALUES ('p1','P');
            INSERT INTO catalog_node (id,platform_id,kind,name) VALUES ('d1','p1','doc_api','D');
            INSERT INTO doc_api (id,version) VALUES ('d1','v1');
            INSERT INTO "group" (id,doc_id,label,sort_ord) VALUES ('g1','d1','G',0);
            INSERT INTO endpoint (id,group_id,method,path,name,description,auth,sort_ord)
              VALUES ('e1','g1','GET','/posts/{postId}/comments/{commentId}','C','',0,0);
            "#,
        ))
        .await
        .unwrap();
        pool
    }

    /// Тело, лежавшее плоскими парами, становится JSON-документом, причём на
    /// сервер уходит ровно то же, что уходило до миграции: типы применяются по
    /// схеме, а ссылки на переменные остаются строками.
    #[tokio::test]
    async fn migration_0030_folds_flat_body_values_into_a_json_document() {
        let pool = test_db::through("0029").await;

        pool.execute(sqlx::raw_sql(
            r#"
            INSERT INTO docs (id,name,version) VALUES ('d1','D','v1');
            INSERT INTO "group" (id,doc_id,label,sort_ord) VALUES ('g1','d1','G',0);
            INSERT INTO endpoint (id,group_id,method,path,name,description,auth,sort_ord)
              VALUES ('e1','g1','POST','/t','T','',0,0);
            INSERT INTO param (endpoint_id,kind,name,type,required,desc,sort_ord) VALUES
              ('e1','body','title','string',0,'',0),
              ('e1','body','count','integer',0,'',1),
              ('e1','body','ratio','number',0,'',2),
              ('e1','body','active','boolean',0,'',3),
              ('e1','body','port','integer',0,'',4),
              ('e1','body','weird','integer',0,'',5);
            INSERT INTO endpoint_requests (id,endpoint_id,name,sort_ord,body_mode,raw_body) VALUES
              ('r1','e1','fields',0,'fields',''),
              ('r2','e1','raw',1,'raw','{"nested":{"a":1}}'),
              ('r3','e1','пусто',2,'fields','');
            INSERT INTO request_param_values (request_id,kind,name,value) VALUES
              ('r1','body','title','Привет "мир"'),
              ('r1','body','count','007'),
              ('r1','body','ratio','12.5'),
              ('r1','body','active','true'),
              ('r1','body','port','{{PORT}}'),
              ('r1','body','weird','не число'),
              ('r1','body','ушёл_из_схемы','x'),
              ('r1','query','page','2'),
              ('r1','path','id','abc');
            "#,
        ))
        .await
        .unwrap();

        test_db::apply(&pool, "0030_request_body_json.sql").await;

        let body: String = sqlx::query_scalar("SELECT body FROM endpoint_requests WHERE id = 'r1'")
            .fetch_one(&pool)
            .await
            .unwrap();
        let doc: serde_json::Value = serde_json::from_str(&body).unwrap();

        assert_eq!(doc["title"], "Привет \"мир\"");
        assert_eq!(doc["count"], 7, "'007' приводится к числу, как Number() в JS");
        assert_eq!(doc["ratio"], 12.5);
        assert_eq!(doc["active"], true);
        assert_eq!(doc["port"], "{{PORT}}", "ссылку подставляют при отправке");
        assert_eq!(doc["weird"], "не число", "неразобранное число остаётся строкой");
        assert!(
            doc.get("ушёл_из_схемы").is_none(),
            "значения вне схемы и раньше не отправлялись"
        );

        // raw переезжает как есть, пустой набор остаётся без тела.
        let raw: String = sqlx::query_scalar("SELECT body FROM endpoint_requests WHERE id = 'r2'")
            .fetch_one(&pool)
            .await
            .unwrap();
        assert_eq!(raw, r#"{"nested":{"a":1}}"#);
        let empty: String =
            sqlx::query_scalar("SELECT body FROM endpoint_requests WHERE id = 'r3'")
                .fetch_one(&pool)
                .await
                .unwrap();
        assert_eq!(empty, "");

        // path и query остаются плоскими, тело из них вычищено.
        let kinds: Vec<String> =
            sqlx::query_scalar("SELECT DISTINCT kind FROM request_param_values ORDER BY kind")
                .fetch_all(&pool)
                .await
                .unwrap();
        assert_eq!(kinds, ["path", "query"]);
    }

    /// Эндпоинт `e1` из [`seeded`] глазами импорта.
    fn target() -> RequestTarget<'static> {
        RequestTarget {
            endpoint_id: "e1",
            path: "/posts/{postId}/comments/{commentId}",
            query_names: vec!["page", "expand"],
        }
    }

    #[tokio::test]
    async fn a_body_kind_value_now_points_at_the_body_field() {
        let pool = test_db::through("0030").await;
        let request: ImportEndpointRequestDTO = serde_json::from_value(serde_json::json!({
            "name": "Broken",
            "values": [{ "kind": "body", "name": "title", "value": "x" }],
        }))
        .unwrap();

        let err = EndpointRequestRepo::new(&pool)
            .insert(&target(), 0, &request)
            .await
            .unwrap_err();
        assert!(err.contains("\"body\""), "невнятная подсказка: {err}");
    }

    /// Набор пишется частями запроса: сегменты пути, строка запроса,
    /// заголовки объектом. Числа принимаются без кавычек — в URL всё равно
    /// уходит текст.
    #[tokio::test]
    async fn a_request_is_written_as_path_query_and_headers() {
        let pool = seeded().await;
        let request: ImportEndpointRequestDTO = serde_json::from_value(serde_json::json!({
            "name": "Комментарии поста",
            "path": { "postId": 42, "commentId": "c-1" },
            "query": { "page": 2, "expand": true, "search": "" },
            "headers": { "X-Request-Id": "smoke" },
        }))
        .unwrap();

        EndpointRequestRepo::new(&pool)
            .insert(&target(), 0, &request)
            .await
            .unwrap();

        let stored = EndpointRequestRepo::new(&pool).list("e1").await.unwrap();
        let values = &stored[0].values;
        let read = |kind: &str, name: &str| {
            values
                .iter()
                .find(|v| v.kind == kind && v.name == name)
                .map(|v| v.value.as_str())
        };

        assert_eq!(read("path", "postId"), Some("42"));
        assert_eq!(read("path", "commentId"), Some("c-1"));
        assert_eq!(read("query", "page"), Some("2"));
        assert_eq!(read("query", "expand"), Some("true"));
        assert_eq!(read("query", "search"), None, "пустое значение не храним");

        assert_eq!(stored[0].headers[0].name, "X-Request-Id");
        assert!(
            stored[0].headers[0].enabled,
            "заголовок из объекта включён по умолчанию"
        );
    }

    /// Файлы прежней версии формата читаются как раньше, а карты `path`
    /// и `query` перекрывают одноимённые значения из `values[]`.
    #[tokio::test]
    async fn the_legacy_values_list_still_imports() {
        let pool = seeded().await;
        let request: ImportEndpointRequestDTO = serde_json::from_value(serde_json::json!({
            "name": "Старый формат",
            "values": [
                { "kind": "path",  "name": "postId", "value": "old" },
                { "kind": "query", "name": "page",   "value": "1" },
            ],
            "path": { "postId": "new" },
        }))
        .unwrap();

        EndpointRequestRepo::new(&pool)
            .insert(&target(), 0, &request)
            .await
            .unwrap();

        let stored = EndpointRequestRepo::new(&pool).list("e1").await.unwrap();
        let values = &stored[0].values;
        assert_eq!(values.len(), 2);
        assert!(values
            .iter()
            .any(|v| v.kind == "path" && v.name == "postId" && v.value == "new"));
        assert!(values
            .iter()
            .any(|v| v.kind == "query" && v.name == "page" && v.value == "1"));
    }

    /// Значение, которому не соответствует ни сегмент пути, ни объявленный
    /// query-параметр, останавливает импорт: подставить его некуда.
    #[tokio::test]
    async fn a_value_that_matches_nothing_stops_the_import() {
        let pool = seeded().await;

        let typo: ImportEndpointRequestDTO = serde_json::from_value(serde_json::json!({
            "name": "Опечатка в сегменте",
            "path": { "postid": "42" },
        }))
        .unwrap();
        let err = EndpointRequestRepo::new(&pool)
            .insert(&target(), 0, &typo)
            .await
            .unwrap_err();
        assert!(err.contains("postid"), "невнятная подсказка: {err}");

        let undeclared: ImportEndpointRequestDTO = serde_json::from_value(serde_json::json!({
            "name": "Незадокументированный параметр",
            "query": { "limit": "10" },
        }))
        .unwrap();
        let err = EndpointRequestRepo::new(&pool)
            .insert(&target(), 0, &undeclared)
            .await
            .unwrap_err();
        assert!(err.contains("queryParams"), "невнятная подсказка: {err}");
    }

    /// Объект или массив в значении параметра — ошибка разбора с подсказкой,
    /// а не молча сериализованный JSON внутри URL.
    #[test]
    fn a_structured_param_value_is_rejected() {
        let err = serde_json::from_value::<ImportEndpointRequestDTO>(serde_json::json!({
            "name": "Broken",
            "query": { "filter": { "status": "open" } },
        }))
        .unwrap_err()
        .to_string();

        assert!(err.contains("filter"), "невнятная подсказка: {err}");
    }
}
