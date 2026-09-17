use crate::domain::doc_api::endpoint::dto::{CreateEndpointDTO, UpdateEndpointDTO};
use crate::domain::doc_api::endpoint::entity::{
    check_field_paths, check_path_params, EndpointRef, FieldDef, ParamDef, ResponseDef,
};
use crate::domain::doc_api::endpoint::repository::EndpointRepository;
use sqlx::SqlitePool;
use std::collections::HashMap;
use uuid::Uuid;

/// Пишет плоские параметры одного вида. Позиция в массиве становится
/// `sort_ord` — по нему они потом и читаются.
async fn insert_params(
    conn: &mut sqlx::SqliteConnection,
    endpoint_id: &str,
    kind: &str,
    params: &[ParamDef],
) -> Result<(), String> {
    for (pi, param) in params.iter().enumerate() {
        sqlx::query(
            "INSERT INTO endpoint_param \
             (endpoint_id, kind, name, type, required, desc, default_val, sort_ord) \
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

/// Пишет примечания к полям тела. Форму тела задаёт сам документ, здесь —
/// только то, чего он о себе не рассказывает.
async fn insert_body_fields(
    conn: &mut sqlx::SqliteConnection,
    endpoint_id: &str,
    fields: &[FieldDef],
) -> Result<(), String> {
    for (fi, field) in fields.iter().enumerate() {
        sqlx::query(
            "INSERT INTO endpoint_body_field \
             (endpoint_id, path, format, required, desc, sort_ord) \
             VALUES (?, ?, ?, ?, ?, ?)",
        )
        .bind(endpoint_id)
        .bind(&field.path)
        .bind(&field.format)
        .bind(if field.required { 1i64 } else { 0i64 })
        .bind(&field.desc)
        .bind(fi as i64)
        .execute(&mut *conn)
        .await
        .map_err(|e| e.to_string())?;
    }
    Ok(())
}

/// Пишет ответы эндпоинта: документ структуры и примечания к его полям.
/// Ключ карты — код статуса.
async fn insert_responses(
    conn: &mut sqlx::SqliteConnection,
    endpoint_id: &str,
    responses: &HashMap<String, ResponseDef>,
) -> Result<(), String> {
    for (status_code, resp) in responses {
        // Файл мог описать ответ и документом, и прежним списком ключей.
        let (body, fields) = resp.document();

        let result = sqlx::query(
            "INSERT INTO response (endpoint_id, status_code, label, body) \
             VALUES (?, ?, ?, ?)",
        )
        .bind(endpoint_id)
        .bind(status_code)
        .bind(&resp.label)
        .bind(&body)
        .execute(&mut *conn)
        .await
        .map_err(|e| e.to_string())?;

        let resp_id = result.last_insert_rowid();

        for (fi, field) in fields.iter().enumerate() {
            sqlx::query(
                "INSERT INTO response_field \
                 (response_id, path, format, required, desc, sort_ord) \
                 VALUES (?, ?, ?, ?, ?, ?)",
            )
            .bind(resp_id)
            .bind(&field.path)
            .bind(&field.format)
            .bind(if field.required { 1i64 } else { 0i64 })
            .bind(&field.desc)
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

        check_path_params(&endpoint.method, &endpoint.path, &endpoint.path_params)?;

        // Файл мог описать тело и документом, и прежним плоским списком —
        // дальше по коду разницы быть не должно.
        let (body, body_fields) = endpoint.body_document();
        check_field_paths(&endpoint.method, &endpoint.path, "тела", &body_fields)?;

        let endpoint_id = Uuid::new_v4().to_string();

        let sort_ord: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM endpoint WHERE group_id = ?")
            .bind(group_id)
            .fetch_one(self.db)
            .await
            .map_err(|e| e.to_string())?;

        sqlx::query(
            "INSERT INTO endpoint \
             (id, group_id, method, path, name, description, auth, body, sort_ord) \
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        )
        .bind(&endpoint_id)
        .bind(group_id)
        .bind(&endpoint.method)
        .bind(&endpoint.path)
        .bind(&endpoint.name)
        .bind(&endpoint.description)
        .bind(if endpoint.auth { 1i64 } else { 0i64 })
        .bind(&body)
        .bind(sort_ord as i64)
        .execute(db)
        .await
        .map_err(|e| e.to_string())?;

        let mut conn = db.acquire().await.map_err(|e| e.to_string())?;
        insert_params(&mut conn, &endpoint_id, "path", &endpoint.path_params).await?;
        insert_params(&mut conn, &endpoint_id, "query", &endpoint.query_params).await?;
        insert_params(&mut conn, &endpoint_id, "header", &endpoint.header_params).await?;
        insert_params(&mut conn, &endpoint_id, "cookie", &endpoint.cookie_params).await?;
        insert_body_fields(&mut conn, &endpoint_id, &body_fields).await?;
        insert_responses(&mut conn, &endpoint_id, &endpoint.responses).await?;

        Ok(endpoint_id)
    }

    async fn update(&self, endpoint: &UpdateEndpointDTO) -> Result<(), String> {
        let (body, body_fields) = endpoint.body_document();
        check_field_paths(&endpoint.method, &endpoint.path, "тела", &body_fields)?;

        let mut tx = self.db.begin().await.map_err(|e| e.to_string())?;

        sqlx::query(
            "UPDATE endpoint \
             SET method = ?, path = ?, name = ?, description = ?, auth = ?, body = ? \
             WHERE id = ?",
        )
        .bind(&endpoint.method)
        .bind(&endpoint.path)
        .bind(&endpoint.name)
        .bind(&endpoint.description)
        .bind(if endpoint.auth { 1i64 } else { 0i64 })
        .bind(&body)
        .bind(&endpoint.id)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

        // Значение параметра — не часть его описания: его выставляет
        // пользователь в «Try it», а правка эндпоинта (и тем более повторный
        // импорт файла, где значений нет вовсе) описание меняет, а выбор
        // пользователя трогать не должна. Параметры пересоздаются целиком,
        // поэтому значения снимаются заранее и возвращаются по имени.
        let kept: Vec<(String, String, String)> = sqlx::query_as(
            "SELECT kind, name, value FROM endpoint_param \
             WHERE endpoint_id = ? AND value <> ''",
        )
        .bind(&endpoint.id)
        .fetch_all(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

        // Описание правится целиком, поэтому параметры и примечания
        // пересоздаются.
        sqlx::query("DELETE FROM endpoint_param WHERE endpoint_id = ?")
            .bind(&endpoint.id)
            .execute(&mut *tx)
            .await
            .map_err(|e| e.to_string())?;
        sqlx::query("DELETE FROM endpoint_body_field WHERE endpoint_id = ?")
            .bind(&endpoint.id)
            .execute(&mut *tx)
            .await
            .map_err(|e| e.to_string())?;

        insert_params(&mut tx, &endpoint.id, "path", &endpoint.path_params).await?;
        insert_params(&mut tx, &endpoint.id, "query", &endpoint.query_params).await?;
        insert_params(&mut tx, &endpoint.id, "header", &endpoint.header_params).await?;
        insert_params(&mut tx, &endpoint.id, "cookie", &endpoint.cookie_params).await?;
        insert_body_fields(&mut tx, &endpoint.id, &body_fields).await?;

        // Параметр, которого в новом описании нет, значение не получает —
        // UPDATE просто не находит строку.
        for (kind, name, value) in &kept {
            sqlx::query(
                "UPDATE endpoint_param SET value = ? \
                 WHERE endpoint_id = ? AND kind = ? AND name = ?",
            )
            .bind(value)
            .bind(&endpoint.id)
            .bind(kind)
            .bind(name)
            .execute(&mut *tx)
            .await
            .map_err(|e| e.to_string())?;
        }
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

    async fn find_by_signature(
        &self,
        doc_id: &str,
        method: &str,
        path: &str,
    ) -> Result<Option<EndpointRef>, String> {
        // Сырая строка: имя таблицы `group` — ключевое слово SQL и живёт
        // в кавычках. Переносы здесь настоящие, а не через `\`, — в сырой
        // строке обратный слэш остался бы в самом запросе.
        let found: Vec<(String, String)> = sqlx::query_as(
            r#"SELECT e.id, e.group_id FROM endpoint e
               JOIN "group" g ON g.id = e.group_id
               WHERE g.doc_id = ? AND e.method = ? AND e.path = ?"#,
        )
        .bind(doc_id)
        .bind(method)
        .bind(path)
        .fetch_all(self.db)
        .await
        .map_err(|e| e.to_string())?;

        // Сигнатуру никто не обещал уникальной: один и тот же метод с тем же
        // путём можно завести в двух группах руками. Обновить наугад один из
        // них — значит тихо разойтись с файлом.
        if found.len() > 1 {
            return Err(format!(
                "в документе несколько эндпоинтов {method} {path} — \
                 оставьте один, иначе непонятно, какой из них обновлять"
            ));
        }

        Ok(found
            .into_iter()
            .next()
            .map(|(id, group_id)| EndpointRef { id, group_id }))
    }

    async fn move_to_group(&self, endpoint_id: &str, group_id: &str) -> Result<(), String> {
        let sort_ord: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM endpoint WHERE group_id = ?")
            .bind(group_id)
            .fetch_one(self.db)
            .await
            .map_err(|e| e.to_string())?;

        sqlx::query("UPDATE endpoint SET group_id = ?, sort_ord = ? WHERE id = ?")
            .bind(group_id)
            .bind(sort_ord)
            .bind(endpoint_id)
            .execute(self.db)
            .await
            .map_err(|e| e.to_string())?;

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

    /// Заголовки и куки становятся такими же параметрами, как путь и строка
    /// запроса: таблица одна, видов четыре.
    #[tokio::test]
    async fn migration_0050_opens_the_table_for_headers_and_cookies() {
        let pool = test_db::through("0049").await;

        pool.execute(sqlx::raw_sql(
            r#"
            INSERT INTO platforms (id,name) VALUES ('p1','P');
            INSERT INTO catalog_node (id,platform_id,kind,name) VALUES ('d1','p1','doc_api','D');
            INSERT INTO doc_api (id) VALUES ('d1');
            INSERT INTO "group" (id,doc_id,label,sort_ord) VALUES ('g1','d1','G',0);
            INSERT INTO endpoint (id,group_id,method,path,name,description,auth,sort_ord)
              VALUES ('e1','g1','GET','/posts/{postId}','P','',0,0);
            INSERT INTO endpoint_url_param
              (endpoint_id,kind,name,type,required,desc,default_val,value,sort_ord)
              VALUES ('e1','query','page','integer',0,'Страница','1','PAGE_VAR',0);
            "#,
        ))
        .await
        .unwrap();

        // До миграции заголовок описать нельзя.
        assert!(
            pool.execute(sqlx::raw_sql(
                "INSERT INTO endpoint_url_param (endpoint_id,kind,name,type) \
                 VALUES ('e1','header','X-Request-Id','string')",
            ))
            .await
            .is_err(),
            "до 0050 kind='header' должен отбиваться CHECK-констрейнтом"
        );

        test_db::apply(&pool, "0050_endpoint_param_kinds.sql").await;

        let moved: Vec<(String, String, String)> =
            sqlx::query_as("SELECT kind, name, value FROM endpoint_param WHERE endpoint_id = 'e1'")
                .fetch_all(&pool)
                .await
                .unwrap();
        assert_eq!(
            moved,
            vec![("query".into(), "page".into(), "PAGE_VAR".into())],
            "описание и привязка к переменной переезжают как есть"
        );

        for kind in ["header", "cookie"] {
            pool.execute(sqlx::raw_sql(&format!(
                "INSERT INTO endpoint_param (endpoint_id,kind,name,type) \
                 VALUES ('e1','{kind}','X','string')",
            )))
            .await
            .unwrap_or_else(|e| panic!("вид {kind} должен приниматься: {e}"));
        }
    }

    /// Плоские поля тела сворачиваются в документ: порядок берётся из
    /// `sort_ord`, умолчание становится значением, а то, чего JSON не
    /// различает, уходит в уточнение типа.
    #[tokio::test]
    async fn migration_0048_folds_body_params_into_a_document() {
        let pool = test_db::through("0047").await;

        pool.execute(sqlx::raw_sql(
            r#"
            INSERT INTO platforms (id,name) VALUES ('p1','P');
            INSERT INTO catalog_node (id,platform_id,kind,name) VALUES ('d1','p1','doc_api','D');
            INSERT INTO doc_api (id) VALUES ('d1');
            INSERT INTO "group" (id,doc_id,label,sort_ord) VALUES ('g1','d1','G',0);
            INSERT INTO endpoint (id,group_id,method,path,name,description,auth,sort_ord)
              VALUES ('e1','g1','POST','/tasks','T','',0,0),
                     ('e2','g1','GET','/tasks','L','',0,1);
            INSERT INTO param (endpoint_id,kind,name,type,required,desc,default_val,value,sort_ord)
              VALUES ('e1','body','title','string',1,'Заголовок',NULL,'',0),
                     ('e1','body','limit','integer',0,'Сколько','20','',1),
                     ('e1','body','done','boolean',0,'Готово',NULL,'',2),
                     ('e1','body','owner','uuid',1,'Владелец',NULL,'',3),
                     ('e1','body','meta','object',0,'Мета',NULL,'',4);
            "#,
        ))
        .await
        .unwrap();

        test_db::apply(&pool, "0048_endpoint_body_document.sql").await;

        let body: String = sqlx::query_scalar("SELECT body FROM endpoint WHERE id = 'e1'")
            .fetch_one(&pool)
            .await
            .unwrap();
        let document: serde_json::Value = serde_json::from_str(&body).unwrap();
        assert_eq!(
            document,
            serde_json::json!({
                "title": "<title>",
                "limit": 20,
                "done": true,
                "owner": "00000000-0000-0000-0000-000000000000",
                "meta": {}
            }),
            "умолчание едет значением, остальное — образцом по типу"
        );
        assert_eq!(
            document.as_object().unwrap().keys().collect::<Vec<_>>(),
            vec!["title", "limit", "done", "owner", "meta"],
            "порядок полей в документе взят из sort_ord, а не по алфавиту"
        );

        let empty: String = sqlx::query_scalar("SELECT body FROM endpoint WHERE id = 'e2'")
            .fetch_one(&pool)
            .await
            .unwrap();
        assert_eq!(empty, "", "эндпоинт без полей тела остаётся без документа");

        let notes: Vec<(String, String, i64, String)> = sqlx::query_as(
            "SELECT path, format, required, desc FROM endpoint_body_field \
             WHERE endpoint_id = 'e1' ORDER BY sort_ord",
        )
        .fetch_all(&pool)
        .await
        .unwrap();
        assert_eq!(
            notes,
            vec![
                ("title".into(), "".into(), 1, "Заголовок".into()),
                ("limit".into(), "integer".into(), 0, "Сколько".into()),
                ("done".into(), "".into(), 0, "Готово".into()),
                ("owner".into(), "uuid".into(), 1, "Владелец".into()),
                ("meta".into(), "".into(), 0, "Мета".into()),
            ],
            "уточняется только то, чего не видно в документе"
        );

        assert!(
            sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM param")
                .fetch_one(&pool)
                .await
                .is_err(),
            "плоских параметров больше нет ни одного вида"
        );
    }

    /// Схема ответа переезжает на документ: значение поля, которого в примере
    /// не было, вживляется на своё место, а то, что уже описано документом, не
    /// задваивается.
    #[tokio::test]
    async fn migration_0049_moves_response_schemas_onto_the_document() {
        let pool = test_db::through("0048").await;

        pool.execute(sqlx::raw_sql(
            r#"
            INSERT INTO platforms (id,name) VALUES ('p1','P');
            INSERT INTO catalog_node (id,platform_id,kind,name) VALUES ('d1','p1','doc_api','D');
            INSERT INTO doc_api (id) VALUES ('d1');
            INSERT INTO "group" (id,doc_id,label,sort_ord) VALUES ('g1','d1','G',0);
            INSERT INTO endpoint (id,group_id,method,path,name,description,auth,sort_ord)
              VALUES ('e1','g1','GET','/orders','O','',0,0);

            INSERT INTO response (id,endpoint_id,status_code,label,example)
              VALUES (1,'e1','200','200 OK','{"data":{"id":"o-1"},"meta":{"total":3}}'),
                     (2,'e1','500','500','# HELP metrics not json');

            INSERT INTO response_field (response_id,key,type,desc,example,sort_ord)
              VALUES (1,'data.id','uuid','UUID заказа','"o-1"',0),
                     (1,'data.price','number','Цена','42.5',1),
                     (1,'meta.total','integer','Всего',NULL,2),
                     (1,'data.missing.deep','string','Без ветки','"x"',3),
                     (2,'whatever','string','Поле не-JSON ответа',NULL,0);
            "#,
        ))
        .await
        .unwrap();

        test_db::apply(&pool, "0049_response_body_document.sql").await;

        let body: String = sqlx::query_scalar("SELECT body FROM response WHERE id = 1")
            .fetch_one(&pool)
            .await
            .unwrap();
        let document: serde_json::Value = serde_json::from_str(&body).unwrap();
        assert_eq!(
            document["data"]["price"],
            serde_json::json!(42.5),
            "значение поля, которого не было в примере, вживилось в документ"
        );
        assert_eq!(
            document["data"]["id"],
            serde_json::json!("o-1"),
            "то, что уже было в документе, осталось как есть"
        );
        assert!(
            document["data"]["missing"].is_null(),
            "под путь без ветки структура не выдумывается"
        );

        let raw: String = sqlx::query_scalar("SELECT body FROM response WHERE id = 2")
            .fetch_one(&pool)
            .await
            .unwrap();
        assert_eq!(
            raw, "# HELP metrics not json",
            "ответ, который не JSON, миграция не трогает"
        );

        let notes: Vec<(String, String, i64)> = sqlx::query_as(
            "SELECT path, format, required FROM response_field \
             WHERE response_id = 1 ORDER BY sort_ord",
        )
        .fetch_all(&pool)
        .await
        .unwrap();
        assert_eq!(
            notes,
            vec![
                ("data.id".into(), "uuid".into(), 0),
                ("data.price".into(), "".into(), 0),
                ("meta.total".into(), "integer".into(), 0),
                ("data.missing.deep".into(), "".into(), 0),
            ],
            "ключ стал путём, тип — уточнением там, где документ его не показывает"
        );
    }

    /// Старый файл описывал ответ списком ключей рядом с примером. Он читается
    /// и сворачивается так же, как это сделала миграция.
    #[test]
    fn a_legacy_response_schema_becomes_a_document() {
        let response: ResponseDef = serde_json::from_value(serde_json::json!({
            "label": "200 OK",
            "schema": [
                { "key": "token", "type": "string", "desc": "JWT" },
                { "key": "expires_in", "type": "integer", "desc": "Секунд", "example": "3600" }
            ],
            "example": "{\n  \"token\": \"eyJ\"\n}"
        }))
        .unwrap();

        let (body, fields) = response.document();
        assert_eq!(
            serde_json::from_str::<serde_json::Value>(&body).unwrap(),
            serde_json::json!({ "token": "eyJ", "expires_in": 3600 }),
            "пример стал структурой, а значение поля дописалось в неё"
        );
        assert_eq!(fields.len(), 2);
        assert_eq!(fields[1].path, "expires_in");
        assert_eq!(fields[1].format, "integer");
    }

    /// Файл прежнего формата описывал тело плоским списком. Он читается и
    /// сворачивается теми же правилами, что и миграция.
    #[test]
    fn a_legacy_body_params_list_becomes_a_document() {
        let dto: CreateEndpointDTO = serde_json::from_value(serde_json::json!({
            "method": "POST",
            "path": "/tasks",
            "name": "Create",
            "bodyParams": [
                { "name": "title", "type": "string", "required": true, "desc": "Заголовок" },
                { "name": "limit", "type": "integer", "required": false, "desc": "Сколько",
                  "default": "20" }
            ]
        }))
        .unwrap();

        let (body, fields) = dto.body_document();
        assert_eq!(
            serde_json::from_str::<serde_json::Value>(&body).unwrap(),
            serde_json::json!({ "title": "<title>", "limit": 20 })
        );
        assert_eq!(fields.len(), 2);
        assert_eq!(fields[1].format, "integer");
        assert!(fields[0].required);
    }

    /// Новый формат описывает тело объектом, и он побеждает прежнюю секцию.
    #[test]
    fn a_document_in_the_file_wins_over_the_legacy_list() {
        let dto: CreateEndpointDTO = serde_json::from_value(serde_json::json!({
            "method": "POST",
            "path": "/tasks",
            "name": "Create",
            "body": { "title": "", "meta": { "labels": [] } },
            "bodyFields": [{ "path": "meta.labels[]", "desc": "Метки" }],
            "bodyParams": [{ "name": "title", "type": "string", "required": true, "desc": "X" }]
        }))
        .unwrap();

        let (body, fields) = dto.body_document();
        assert!(body.contains("labels"), "тело взято из документа");
        assert_eq!(fields.len(), 1);
        assert_eq!(fields[0].path, "meta.labels[]");
    }

    /// URL-параметры уезжают в свою таблицу вместе со значениями, а поля тела
    /// остаются в `param` — на них переезд не распространяется.
    #[tokio::test]
    async fn migration_0047_moves_url_params_and_leaves_the_body_alone() {
        let pool = test_db::through("0046").await;

        pool.execute(sqlx::raw_sql(
            r#"
            INSERT INTO platforms (id,name) VALUES ('p1','P');
            INSERT INTO catalog_node (id,platform_id,kind,name) VALUES ('d1','p1','doc_api','D');
            INSERT INTO doc_api (id) VALUES ('d1');
            INSERT INTO "group" (id,doc_id,label,sort_ord) VALUES ('g1','d1','G',0);
            INSERT INTO endpoint (id,group_id,method,path,name,description,auth,sort_ord)
              VALUES ('e1','g1','GET','/posts/{postId}','P','',0,0);
            INSERT INTO param (endpoint_id,kind,name,type,required,desc,default_val,value,sort_ord)
              VALUES ('e1','path','postId','uuid',1,'UUID поста',NULL,'',0),
                     ('e1','query','page','integer',0,'Страница','1','PAGE_VAR',1),
                     ('e1','body','title','string',1,'Заголовок',NULL,'',0);
            "#,
        ))
        .await
        .unwrap();

        test_db::apply(&pool, "0047_endpoint_url_param.sql").await;

        let moved: Vec<(String, String, String, String, i64)> = sqlx::query_as(
            "SELECT kind, name, type, value, required FROM endpoint_url_param \
             WHERE endpoint_id = 'e1' ORDER BY sort_ord",
        )
        .fetch_all(&pool)
        .await
        .unwrap();
        assert_eq!(
            moved,
            vec![
                ("path".into(), "postId".into(), "uuid".into(), "".into(), 1),
                (
                    "query".into(),
                    "page".into(),
                    "integer".into(),
                    "PAGE_VAR".into(),
                    0
                ),
            ],
            "описание и привязка к переменной переезжают как есть"
        );

        let left: Vec<(String, String)> =
            sqlx::query_as("SELECT kind, name FROM param WHERE endpoint_id = 'e1'")
                .fetch_all(&pool)
                .await
                .unwrap();
        assert_eq!(
            left,
            vec![("body".into(), "title".into())],
            "в param остаются только поля тела"
        );

        // Вид, которого у URL-параметра быть не может, отбивается CHECK-ом.
        assert!(
            pool.execute(sqlx::raw_sql(
                "INSERT INTO endpoint_url_param (endpoint_id,kind,name,type) \
                 VALUES ('e1','body','x','string')",
            ))
            .await
            .is_err(),
            "kind='body' в таблице URL-параметров недопустим"
        );
    }

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
        let response = |label: &str, path: &str| ResponseDef {
            label: label.to_string(),
            body: format!("{{\"{path}\": \"\"}}"),
            fields: vec![FieldDef {
                path: path.to_string(),
                format: String::new(),
                required: false,
                desc: String::new(),
            }],
            schema: vec![],
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
                    header_params: vec![],
                    cookie_params: vec![],
                    body: String::new(),
                    body_fields: vec![],
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
            header_params: vec![],
            cookie_params: vec![],
            body: String::new(),
            body_fields: vec![],
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

        let paths: Vec<String> = sqlx::query_scalar(
            "SELECT path FROM response_field \
             WHERE response_id IN (SELECT id FROM response WHERE endpoint_id = ?)",
        )
        .bind(&id)
        .fetch_all(&pool)
        .await
        .unwrap();
        assert_eq!(
            paths,
            ["error"],
            "примечания старого ответа не должны остаться"
        );
    }

    /// Вставка сегмента пути в `param` — на схеме до 0031, где такого вида
    /// параметров ещё не было. Таблицы `param` в нынешней схеме нет.
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
