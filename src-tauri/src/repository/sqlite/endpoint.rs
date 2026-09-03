use crate::domain::doc_api::endpoint::dto::{CreateEndpointDTO, UpdateEndpointDTO};
use crate::domain::doc_api::endpoint::entity::{path_segments, ParamDef, ResponseDef};
use crate::domain::doc_api::endpoint::repository::EndpointRepository;
use sqlx::SqlitePool;
use std::collections::HashMap;
use uuid::Uuid;

/// Пишет параметры одного вида (`path`, `query`, `body`). Позиция в массиве
/// становится `sort_ord` — по нему они потом и читаются.
async fn insert_params(
    conn: &mut sqlx::SqliteConnection,
    endpoint_id: &str,
    kind: &str,
    params: &[ParamDef],
) -> Result<(), String> {
    for (pi, param) in params.iter().enumerate() {
        sqlx::query(
            "INSERT INTO param (endpoint_id, kind, name, type, required, desc, default_val, sort_ord) \
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        )
        .bind(endpoint_id)
        .bind(kind)
        .bind(&param.name)
        .bind(&param.type_)
        .bind(if param.required { 1i64 } else { 0i64 })
        .bind(&param.desc)
        .bind(&param.default)
        .bind(pi as i64)
        .execute(&mut *conn)
        .await
        .map_err(|e| e.to_string())?;
    }
    Ok(())
}

/// Пишет ответы эндпоинта вместе с полями их схем. Ключ карты — код статуса.
async fn insert_responses(
    conn: &mut sqlx::SqliteConnection,
    endpoint_id: &str,
    responses: &HashMap<String, ResponseDef>,
) -> Result<(), String> {
    for (status_code, resp) in responses {
        let result = sqlx::query(
            "INSERT INTO response (endpoint_id, status_code, label, example) \
             VALUES (?, ?, ?, ?)",
        )
        .bind(endpoint_id)
        .bind(status_code)
        .bind(&resp.label)
        .bind(&resp.example)
        .execute(&mut *conn)
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
            .execute(&mut *conn)
            .await
            .map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}

pub struct EndpointRepo<'a> {
    pub db: &'a SqlitePool,
}

impl<'a> EndpointRepo<'a> {
    pub fn new(db: &'a SqlitePool) -> Self {
        Self { db }
    }
}

impl EndpointRepository for EndpointRepo<'_> {
    async fn create(&self, group_id: &str, endpoint: &CreateEndpointDTO) -> Result<String, String> {
        let db = self.db;

        // Описание сегмента, которого нет в пути, — почти всегда опечатка:
        // и панель, и документация ищут описания по именам из самого пути,
        // так что лишняя запись просто пропала бы из виду.
        let segments = path_segments(&endpoint.path);
        for param in &endpoint.path_params {
            if !segments.contains(&param.name.as_str()) {
                return Err(format!(
                    "эндпоинт {} {}: в пути нет сегмента {:?}",
                    endpoint.method, endpoint.path, param.name
                ));
            }
        }

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

        let mut conn = db.acquire().await.map_err(|e| e.to_string())?;
        insert_params(&mut conn, &endpoint_id, "path", &endpoint.path_params).await?;
        insert_params(&mut conn, &endpoint_id, "query", &endpoint.query_params).await?;
        insert_params(&mut conn, &endpoint_id, "body", &endpoint.body_params).await?;
        insert_responses(&mut conn, &endpoint_id, &endpoint.responses).await?;

        Ok(endpoint_id)
    }

    async fn update(&self, endpoint: &UpdateEndpointDTO) -> Result<(), String> {
        let mut tx = self.db.begin().await.map_err(|e| e.to_string())?;

        sqlx::query(
            "UPDATE endpoint SET method = ?, path = ?, name = ?, description = ?, auth = ? \
             WHERE id = ?",
        )
        .bind(&endpoint.method)
        .bind(&endpoint.path)
        .bind(&endpoint.name)
        .bind(&endpoint.description)
        .bind(if endpoint.auth { 1i64 } else { 0i64 })
        .bind(&endpoint.id)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

        // Параметры всех видов правятся целиком, поэтому пересоздаём их.
        sqlx::query("DELETE FROM param WHERE endpoint_id = ?")
            .bind(&endpoint.id)
            .execute(&mut *tx)
            .await
            .map_err(|e| e.to_string())?;

        insert_params(&mut tx, &endpoint.id, "path", &endpoint.path_params).await?;
        insert_params(&mut tx, &endpoint.id, "query", &endpoint.query_params).await?;
        insert_params(&mut tx, &endpoint.id, "body", &endpoint.body_params).await?;

        // Ответы — так же целиком. Поля схем удаляются явно: каскад по внешнему
        // ключу срабатывает только при включённом `foreign_keys`, а на это
        // соединение полагаться нельзя.
        sqlx::query(
            "DELETE FROM response_field \
             WHERE response_id IN (SELECT id FROM response WHERE endpoint_id = ?)",
        )
        .bind(&endpoint.id)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;
        sqlx::query("DELETE FROM response WHERE endpoint_id = ?")
            .bind(&endpoint.id)
            .execute(&mut *tx)
            .await
            .map_err(|e| e.to_string())?;
        insert_responses(&mut tx, &endpoint.id, &endpoint.responses).await?;

        tx.commit().await.map_err(|e| e.to_string())?;

        Ok(())
    }

    async fn delete(&self, endpoint_id: &str) -> Result<(), String> {
        let mut conn = self.db.acquire().await.map_err(|e| e.to_string())?;

        // Ensure dependent rows (params, responses → response fields)
        // are removed via ON DELETE CASCADE.
        sqlx::query("PRAGMA foreign_keys = ON")
            .execute(&mut *conn)
            .await
            .map_err(|e| e.to_string())?;

        sqlx::query("DELETE FROM endpoint WHERE id = ?")
            .bind(endpoint_id)
            .execute(&mut *conn)
            .await
            .map_err(|e| e.to_string())?;

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::repository::sqlite::test_db;
    use sqlx::Executor;

    /// Пересборка таблицы не теряет уже описанные параметры и открывает
    /// дорогу третьему виду — сегментам пути.
    #[tokio::test]
    async fn migration_0031_keeps_params_and_accepts_the_path_kind() {
        let pool = test_db::through("0030").await;

        pool.execute(sqlx::raw_sql(
            r#"
            INSERT INTO docs (id,name,version) VALUES ('d1','D','v1');
            INSERT INTO "group" (id,doc_id,label,sort_ord) VALUES ('g1','d1','G',0);
            INSERT INTO endpoint (id,group_id,method,path,name,description,auth,sort_ord)
              VALUES ('e1','g1','GET','/posts/{postId}','P','',0,0);
            INSERT INTO param (endpoint_id,kind,name,type,required,desc,default_val,value,sort_ord)
              VALUES ('e1','query','page','integer',0,'Страница','1','PAGE_VAR',0);
            "#,
        ))
        .await
        .unwrap();

        // До миграции сегмент пути описать нельзя.
        assert!(
            insert_path_param(&pool).await.is_err(),
            "до 0031 kind='path' должен отбиваться CHECK-констрейнтом"
        );

        test_db::apply(&pool, "0031_path_params.sql").await;

        let kept: (String, String, i64, String, Option<String>, String, i64) = sqlx::query_as(
            "SELECT kind, name, required, desc, default_val, value, sort_ord \
             FROM param WHERE endpoint_id = 'e1'",
        )
        .fetch_one(&pool)
        .await
        .unwrap();
        assert_eq!(
            kept,
            (
                "query".into(),
                "page".into(),
                0,
                "Страница".into(),
                Some("1".into()),
                "PAGE_VAR".into(),
                0
            ),
            "строка должна переехать целиком, вместе с привязкой к переменной"
        );

        insert_path_param(&pool)
            .await
            .expect("после 0031 сегмент пути описывается как параметр");
    }

    /// Правка эндпоинта переписывает его ответы целиком: старый код статуса
    /// уходит вместе с полями схемы, новый появляется с ними.
    #[tokio::test]
    async fn update_replaces_responses_with_their_fields() {
        use crate::domain::doc_api::endpoint::entity::ResponseSchemaField;

        let pool = test_db::migrated().await;
        pool.execute(sqlx::raw_sql(
            r#"
            INSERT INTO platforms (id, name) VALUES ('p1', 'P');
            INSERT INTO catalog_node (id, platform_id, kind, name) VALUES ('d1', 'p1', 'doc_api', 'D');
            INSERT INTO doc_api (id, prefix) VALUES ('d1', '');
            INSERT INTO "group" (id, doc_id, label, sort_ord) VALUES ('g1', 'd1', 'G', 0);
            "#,
        ))
        .await
        .unwrap();

        let repo = EndpointRepo::new(&pool);
        let response = |label: &str, key: &str| ResponseDef {
            label: label.to_string(),
            schema: vec![ResponseSchemaField {
                key: key.to_string(),
                type_: "string".to_string(),
                desc: String::new(),
                example: None,
            }],
            example: "{}".to_string(),
        };

        let id = repo
            .create(
                "g1",
                &CreateEndpointDTO {
                    method: "GET".into(),
                    path: "/posts".into(),
                    name: "P".into(),
                    description: String::new(),
                    auth: false,
                    path_params: vec![],
                    query_params: vec![],
                    body_params: vec![],
                    responses: HashMap::from([("200".to_string(), response("OK", "id"))]),
                    requests: vec![],
                },
            )
            .await
            .unwrap();

        repo.update(&UpdateEndpointDTO {
            id: id.clone(),
            method: "GET".into(),
            path: "/posts".into(),
            name: "P".into(),
            description: String::new(),
            auth: false,
            path_params: vec![],
            query_params: vec![],
            body_params: vec![],
            responses: HashMap::from([("404".to_string(), response("Not found", "error"))]),
        })
        .await
        .unwrap();

        let codes: Vec<String> =
            sqlx::query_scalar("SELECT status_code FROM response WHERE endpoint_id = ?")
                .bind(&id)
                .fetch_all(&pool)
                .await
                .unwrap();
        assert_eq!(codes, ["404"]);

        let keys: Vec<String> = sqlx::query_scalar(
            "SELECT key FROM response_field \
             WHERE response_id IN (SELECT id FROM response WHERE endpoint_id = ?)",
        )
        .bind(&id)
        .fetch_all(&pool)
        .await
        .unwrap();
        assert_eq!(keys, ["error"], "поля старого ответа не должны остаться");
    }

    async fn insert_path_param(pool: &SqlitePool) -> Result<(), sqlx::Error> {
        sqlx::query(
            "INSERT INTO param (endpoint_id, kind, name, type, required, desc, sort_ord) \
             VALUES ('e1', 'path', 'postId', 'uuid', 1, 'UUID поста', 0)",
        )
        .execute(pool)
        .await
        .map(|_| ())
    }
}
