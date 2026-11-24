use crate::domain::doc_api::endpoint::entity::{Endpoint, FieldDef, ParamDef, ResponseDef};
use crate::domain::doc_api::endpoint::repository::EndpointRepository;
use crate::domain::doc_api::endpoint_request::repository::{
    EndpointRequestRepository, RequestTarget,
};
use crate::domain::doc_api::group::dto::CreateGroupDTO;
use crate::domain::doc_api::group::entity::Group;
use crate::domain::doc_api::group::repository::GroupRepository;
use crate::repository::sqlite::endpoint::EndpointRepo;
use crate::repository::sqlite::endpoint_request::EndpointRequestRepo;
use sqlx::{Row, SqlitePool};
use std::collections::HashMap;
use uuid::Uuid;

pub struct GroupRepo<'a> {
    pub db: &'a SqlitePool,
}

impl<'a> GroupRepo<'a> {
    pub fn new(db: &'a SqlitePool) -> Self {
        Self { db }
    }
}

impl GroupRepository for GroupRepo<'_> {
    async fn all(&self, doc_id: &str) -> Result<Vec<Group>, String> {
        let db = self.db;
        let group_rows = sqlx::query(r#"SELECT * FROM "group" WHERE doc_id = ? ORDER BY sort_ord"#)
            .bind(doc_id)
            .fetch_all(db)
            .await
            .map_err(|e| e.to_string())?;

        if group_rows.is_empty() {
            return Ok(vec![]);
        }

        let group_ids: Vec<String> = group_rows.iter().map(|r| r.get("id")).collect();

        let mut eq = sqlx::QueryBuilder::new("SELECT * FROM endpoint WHERE group_id IN (");
        let mut sep = eq.separated(",");
        for id in &group_ids {
            sep.push_bind(id);
        }
        eq.push(") ORDER BY sort_ord");

        let endpoint_rows = eq.build().fetch_all(db).await.map_err(|e| e.to_string())?;

        if endpoint_rows.is_empty() {
            return Ok(group_rows
                .iter()
                .map(|g| Group {
                    id: g.get("id"),
                    label: g.get("label"),
                    endpoints: vec![],
                })
                .collect());
        }

        let endpoint_ids: Vec<String> = endpoint_rows.iter().map(|r| r.get("id")).collect();

        let mut uq = sqlx::QueryBuilder::new("SELECT * FROM endpoint_param WHERE endpoint_id IN (");
        let mut sep = uq.separated(",");
        for id in &endpoint_ids {
            sep.push_bind(id);
        }
        uq.push(") ORDER BY sort_ord");

        let mut bq =
            sqlx::QueryBuilder::new("SELECT * FROM endpoint_body_field WHERE endpoint_id IN (");
        let mut sep = bq.separated(",");
        for id in &endpoint_ids {
            sep.push_bind(id);
        }
        bq.push(") ORDER BY sort_ord");

        let mut rq = sqlx::QueryBuilder::new("SELECT * FROM response WHERE endpoint_id IN (");
        let mut sep = rq.separated(",");
        for id in &endpoint_ids {
            sep.push_bind(id);
        }
        rq.push(")");

        let (param_rows, body_field_rows, response_rows) = tokio::try_join!(
            uq.build().fetch_all(db),
            bq.build().fetch_all(db),
            rq.build().fetch_all(db),
        )
        .map_err(|e| e.to_string())?;

        let response_ids: Vec<i64> = response_rows.iter().map(|r| r.get("id")).collect();

        let response_field_rows = if response_ids.is_empty() {
            vec![]
        } else {
            let mut rfq =
                sqlx::QueryBuilder::new("SELECT * FROM response_field WHERE response_id IN (");
            let mut sep = rfq.separated(",");
            for id in &response_ids {
                sep.push_bind(id);
            }
            rfq.push(") ORDER BY sort_ord");

            rfq.build().fetch_all(db).await.map_err(|e| e.to_string())?
        };

        let endpoint_group_map: HashMap<String, String> = endpoint_rows
            .iter()
            .map(|r| (r.get::<String, _>("id"), r.get::<String, _>("group_id")))
            .collect();

        let endpoints: Vec<Endpoint> = endpoint_rows
            .iter()
            .map(|e| {
                let eid: String = e.get("id");

                let to_param = |p: &sqlx::sqlite::SqliteRow| ParamDef {
                    name: p.get("name"),
                    type_: p.get("type"),
                    required: p.get::<i64, _>("required") != 0,
                    desc: p.get("desc"),
                    default: p.get("default_val"),
                    value: p.get("value"),
                };

                let params_of = |kind: &str| -> Vec<ParamDef> {
                    param_rows
                        .iter()
                        .filter(|p| {
                            p.get::<String, _>("endpoint_id") == eid
                                && p.get::<String, _>("kind") == kind
                        })
                        .map(&to_param)
                        .collect()
                };

                let path_params = params_of("path");
                let query_params = params_of("query");
                let header_params = params_of("header");
                let cookie_params = params_of("cookie");

                // Форму тела задаёт документ; здесь — только примечания к его
                // полям, по одному на путь.
                let body_fields: Vec<FieldDef> = body_field_rows
                    .iter()
                    .filter(|f| f.get::<String, _>("endpoint_id") == eid)
                    .map(|f| FieldDef {
                        path: f.get("path"),
                        format: f.get("format"),
                        required: f.get::<i64, _>("required") != 0,
                        desc: f.get("desc"),
                    })
                    .collect();

                let mut responses: HashMap<String, ResponseDef> = HashMap::new();
                for resp in response_rows
                    .iter()
                    .filter(|r| r.get::<String, _>("endpoint_id") == eid)
                {
                    let rid: i64 = resp.get("id");
                    let fields: Vec<FieldDef> = response_field_rows
                        .iter()
                        .filter(|f| f.get::<i64, _>("response_id") == rid)
                        .map(|f| FieldDef {
                            path: f.get("path"),
                            format: f.get("format"),
                            required: f.get::<i64, _>("required") != 0,
                            desc: f.get("desc"),
                        })
                        .collect();

                    responses.insert(
                        resp.get("status_code"),
                        ResponseDef {
                            label: resp.get("label"),
                            body: resp.get("body"),
                            fields,
                            // Прежняя форма схемы живёт только в файлах.
                            schema: Vec::new(),
                        },
                    );
                }

                Endpoint {
                    id: eid,
                    method: e.get("method"),
                    path: e.get("path"),
                    name: e.get("name"),
                    description: e.get("description"),
                    auth: e.get::<i64, _>("auth") != 0,
                    path_params,
                    query_params,
                    header_params,
                    cookie_params,
                    body: e.get("body"),
                    body_fields,
                    responses,
                }
            })
            .collect();

        let mut endpoint_by_group: HashMap<String, Vec<Endpoint>> = HashMap::new();
        for endpoint in endpoints {
            if let Some(gid) = endpoint_group_map.get(&endpoint.id) {
                endpoint_by_group
                    .entry(gid.clone())
                    .or_default()
                    .push(endpoint);
            }
        }

        let mut groups = Vec::new();
        for g in &group_rows {
            let gid: String = g.get("id");
            groups.push(Group {
                id: gid.clone(),
                label: g.get("label"),
                endpoints: endpoint_by_group.remove(&gid).unwrap_or_default(),
            });
        }

        Ok(groups)
    }

    async fn find_by_label(&self, doc_id: &str, label: &str) -> Result<Option<String>, String> {
        let ids: Vec<String> =
            sqlx::query_scalar(r#"SELECT id FROM "group" WHERE doc_id = ? AND label = ?"#)
                .bind(doc_id)
                .bind(label)
                .fetch_all(self.db)
                .await
                .map_err(|e| e.to_string())?;

        // Названия групп ничем не ограничены, и две одинаковые в документе
        // завести можно. Для повторного импорта это тупик: угадывать, в какую
        // из них писать, хуже, чем сказать об этом вслух.
        if ids.len() > 1 {
            return Err(format!(
                "в документе несколько групп с названием {label:?} — \
                 переименуйте одну из них, иначе непонятно, в какую дописывать файл"
            ));
        }

        Ok(ids.into_iter().next())
    }

    async fn create(&self, doc_id: &str, groups: &[CreateGroupDTO]) -> Result<(), String> {
        // Позиция отсчитывается от конца списка, а не от нуля: в пустой
        // документ группы лягут как лежали в файле, а в непустой — допишутся
        // в конец, вместо того чтобы перемешаться с уже лежащими там.
        let first: i64 = sqlx::query_scalar(r#"SELECT COUNT(*) FROM "group" WHERE doc_id = ?"#)
            .bind(doc_id)
            .fetch_one(self.db)
            .await
            .map_err(|e| e.to_string())?;

        for (gi, group) in groups.iter().enumerate() {
            let group_id = self
                .insert_group(doc_id, group, first as usize + gi)
                .await?;
            let endpoint_repo = EndpointRepo::new(self.db);
            let request_repo = EndpointRequestRepo::new(self.db);
            for endpoint in &group.endpoints {
                let endpoint_id = endpoint_repo.create(&group_id, endpoint).await?;
                // Наборы «Try it» из импортируемого файла: порядок берём из
                // позиции в массиве, id генерирует репозиторий.
                let target = RequestTarget {
                    endpoint_id: &endpoint_id,
                    path: &endpoint.path,
                    query_names: endpoint
                        .query_params
                        .iter()
                        .map(|param| param.name.as_str())
                        .collect(),
                };
                for (ri, request) in endpoint.requests.iter().enumerate() {
                    request_repo.insert(&target, ri as i64, request).await?;
                }
            }
        }
        Ok(())
    }

    /// Удаляет группу. Только если она пустая (без эндпоинтов).
    async fn delete(&self, group_id: &str) -> Result<(), String> {
        let endpoint_count: i64 =
            sqlx::query_scalar(r#"SELECT COUNT(*) FROM endpoint WHERE group_id = ?"#)
                .bind(group_id)
                .fetch_one(self.db)
                .await
                .map_err(|e| e.to_string())?;

        if endpoint_count > 0 {
            return Err("Нельзя удалить непустую группу".to_string());
        }

        sqlx::query(r#"DELETE FROM "group" WHERE id = ?"#)
            .bind(group_id)
            .execute(self.db)
            .await
            .map_err(|e| e.to_string())?;

        Ok(())
    }
}

impl GroupRepo<'_> {
    /// Создаёт новую (пустую) группу в конце списка и возвращает её id.
    pub async fn create_group(&self, doc_id: &str, label: &str) -> Result<String, String> {
        let sort_ord: i64 = sqlx::query_scalar(r#"SELECT COUNT(*) FROM "group" WHERE doc_id = ?"#)
            .bind(doc_id)
            .fetch_one(self.db)
            .await
            .map_err(|e| e.to_string())?;

        let group = CreateGroupDTO {
            label: label.to_string(),
            endpoints: vec![],
        };
        self.insert_group(doc_id, &group, sort_ord as usize).await
    }

    async fn insert_group(
        &self,
        doc_id: &str,
        group: &CreateGroupDTO,
        sort_ord: usize,
    ) -> Result<String, String> {
        let group_id = Uuid::new_v4().to_string();

        sqlx::query(r#"INSERT INTO "group" (id, doc_id, label, sort_ord) VALUES (?, ?, ?, ?)"#)
            .bind(&group_id)
            .bind(doc_id)
            .bind(&group.label)
            .bind(sort_ord as i64)
            .execute(self.db)
            .await
            .map_err(|e| e.to_string())?;

        Ok(group_id)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::catalog::dto::NewNode;
    use crate::domain::catalog::entity::NodeKind;
    use crate::domain::catalog::repository::CatalogRepository;
    use crate::domain::doc_api::doc_api::dto::DocApiPayload;
    use crate::domain::doc_api::doc_api::repository::DocApiRepository;
    use crate::repository::sqlite::catalog::CatalogRepo;
    use crate::repository::sqlite::doc_api::DocApiRepo;
    use serde::Deserialize;
    use sqlx::sqlite::SqlitePoolOptions;

    /// Заголовок импортируемого файла. Разбирает его фронтенд — он же собирает
    /// из него узел дерева, — поэтому здесь повторена ровно та часть, которая
    /// доезжает до бэкенда.
    #[derive(Deserialize)]
    struct ImportFile {
        doc: ImportDoc,
        groups: Vec<CreateGroupDTO>,
    }

    #[derive(Deserialize)]
    struct ImportDoc {
        name: String,
        #[serde(default)]
        prefix: String,
    }

    /// Документ на своём месте в дереве: платформа, узел, поля документа.
    /// Ровно то, что делает `import_doc` до того, как отдать группы репозиторию.
    async fn imported_doc(pool: &SqlitePool, doc: ImportDoc) -> String {
        sqlx::query("INSERT OR IGNORE INTO platforms (id, name) VALUES ('p1', 'P')")
            .execute(pool)
            .await
            .unwrap();

        let node = CatalogRepo::new(pool)
            .create(&NewNode {
                platform_id: "p1",
                parent_id: None,
                kind: NodeKind::DocApi,
                name: &doc.name,
            })
            .await
            .unwrap();

        DocApiRepo::new(pool)
            .create(&node.id, &DocApiPayload { prefix: doc.prefix })
            .await
            .unwrap();

        node.id
    }

    /// Схема из настоящих миграций — тест ловит и рассинхрон с ними.
    async fn db() -> SqlitePool {
        let pool = SqlitePoolOptions::new()
            .max_connections(1)
            .connect("sqlite::memory:")
            .await
            .unwrap();
        sqlx::migrate!("./migrations").run(&pool).await.unwrap();
        pool
    }

    /// Пример из документации импортируется целиком, вместе с наборами «Try it».
    /// Файл подключён через `include_str!`, поэтому тест краснеет, если пример
    /// разъедется с DTO — документация не сможет соврать молча.
    #[tokio::test]
    async fn the_documented_example_imports_with_its_test_requests() {
        let raw = include_str!("../../../../docs/import/doc-api/doc-api-example-import.json");
        let file: ImportFile = serde_json::from_str(raw).expect("пример не разбирается");

        let pool = db().await;
        let doc_id = imported_doc(&pool, file.doc).await;
        GroupRepo::new(&pool)
            .create(&doc_id, &file.groups)
            .await
            .unwrap();

        // Наборы легли на свои эндпоинты, а не куда попало.
        let login_id: String = sqlx::query_scalar(
            "SELECT id FROM endpoint WHERE path = '/auth/login' AND method = 'POST'",
        )
        .fetch_one(&pool)
        .await
        .unwrap();

        let login = EndpointRequestRepo::new(&pool)
            .list(&login_id)
            .await
            .unwrap();
        assert_eq!(
            login.iter().map(|r| r.name.as_str()).collect::<Vec<_>>(),
            ["Валидные учётные данные", "Неверный пароль — ждём 401"],
            "порядок наборов должен идти из файла"
        );
        let login_body: serde_json::Value = serde_json::from_str(&login[0].body).unwrap();
        assert_eq!(login_body["email"], "admin@example.com");
        assert!(
            login[0].values.is_empty(),
            "тело больше не хранится плоскими значениями"
        );

        // Тело-объект из файла доехало документом, вложенность сохранилась.
        let create_task_id: String =
            sqlx::query_scalar("SELECT id FROM endpoint WHERE path = '/tasks' AND method = 'POST'")
                .fetch_one(&pool)
                .await
                .unwrap();
        let tasks = EndpointRequestRepo::new(&pool)
            .list(&create_task_id)
            .await
            .unwrap();
        let nested: serde_json::Value = serde_json::from_str(&tasks[0].body).unwrap();
        assert_eq!(nested["title"], "Подготовить релиз");
        assert_eq!(nested["meta"]["labels"][0], "release");
        assert_eq!(nested["meta"]["estimate"]["value"], 8);
        assert_eq!(tasks[0].headers[0].name, "Idempotency-Key");
        assert_eq!(
            tasks[0].cookies[0].name, "session",
            "куки набора доезжают вместе с заголовками"
        );

        // Заголовки и куки описаны как параметры эндпоинта.
        let described: Vec<(String, String, i64)> = sqlx::query_as(
            "SELECT kind, name, required FROM endpoint_param \
             WHERE endpoint_id = ? AND kind IN ('header', 'cookie') ORDER BY kind",
        )
        .bind(&create_task_id)
        .fetch_all(&pool)
        .await
        .unwrap();
        assert_eq!(
            described,
            vec![
                ("cookie".into(), "session".into(), 1),
                ("header".into(), "Idempotency-Key".into(), 0),
            ]
        );

        // Тело-строка остаётся дословно, без попытки разобрать его как JSON.
        assert_eq!(tasks[2].body, "title=Подготовить релиз&priority=high");

        // Выключенный заголовок сохраняется именно выключенным.
        let delete_user_id: String = sqlx::query_scalar(
            "SELECT id FROM endpoint WHERE path = '/users/{id}' AND method = 'DELETE'",
        )
        .fetch_one(&pool)
        .await
        .unwrap();
        let del = EndpointRequestRepo::new(&pool)
            .list(&delete_user_id)
            .await
            .unwrap();
        assert!(!del[0].headers[0].enabled);
        assert!(del[0]
            .values
            .iter()
            .any(|v| v.kind == "path" && v.name == "id"));

        // Набор, где заданы все части запроса разом: сегмент пути, строка
        // запроса, заголовок и тело.
        let patch_task_id: String = sqlx::query_scalar(
            "SELECT id FROM endpoint WHERE path = '/tasks/{id}' AND method = 'PATCH'",
        )
        .fetch_one(&pool)
        .await
        .unwrap();
        let patch = EndpointRequestRepo::new(&pool)
            .list(&patch_task_id)
            .await
            .unwrap();
        let value = |kind: &str, name: &str| {
            patch[0]
                .values
                .iter()
                .find(|v| v.kind == kind && v.name == name)
                .map(|v| v.value.as_str())
        };
        assert!(value("path", "id").is_some());
        assert_eq!(
            value("query", "notify"),
            Some("true"),
            "булево значение параметра доезжает строкой"
        );
        assert_eq!(patch[0].headers[0].name, "Idempotency-Key");
        assert!(
            patch[0].headers[0].enabled,
            "объект задаёт включённые заголовки"
        );
        let patch_body: serde_json::Value = serde_json::from_str(&patch[0].body).unwrap();
        assert_eq!(patch_body["status"], "done");

        // Описания сегментов пути доезжают вместе со схемой эндпоинта.
        let described: Vec<(String, String, String)> = sqlx::query_as(
            "SELECT name, type, desc FROM endpoint_param \
             WHERE endpoint_id = ? AND kind = 'path' ORDER BY sort_ord",
        )
        .bind(&patch_task_id)
        .fetch_all(&pool)
        .await
        .unwrap();
        assert_eq!(
            described,
            vec![("id".into(), "uuid".into(), "UUID задачи".into())]
        );

        // Тело описано документом, а примечания цепляются к его путям.
        let login_id: String = sqlx::query_scalar(
            "SELECT e.id FROM endpoint e JOIN \"group\" g ON g.id = e.group_id \
             WHERE g.doc_id = ? AND e.method = 'POST' AND e.path = '/auth/login'",
        )
        .bind(&doc_id)
        .fetch_one(&pool)
        .await
        .unwrap();

        let body: String = sqlx::query_scalar("SELECT body FROM endpoint WHERE id = ?")
            .bind(&login_id)
            .fetch_one(&pool)
            .await
            .unwrap();
        assert_eq!(
            serde_json::from_str::<serde_json::Value>(&body).unwrap(),
            serde_json::json!({ "email": "<email>", "password": "<password>" }),
            "структура тела приезжает документом, как написана в файле"
        );

        let notes: Vec<(String, String, i64)> = sqlx::query_as(
            "SELECT path, desc, required FROM endpoint_body_field \
             WHERE endpoint_id = ? ORDER BY sort_ord",
        )
        .bind(&login_id)
        .fetch_all(&pool)
        .await
        .unwrap();
        assert_eq!(
            notes,
            vec![
                ("email".into(), "Email пользователя".into(), 1),
                ("password".into(), "Пароль (мин. 8 символов)".into(), 1),
            ]
        );

        // Эндпоинты без секции `requests` остаются без наборов.
        let total: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM endpoint_requests")
            .fetch_one(&pool)
            .await
            .unwrap();
        assert_eq!(total, 12);
    }

    /// Описание сегмента, которого нет в пути, — опечатка: такой эндпоинт
    /// не импортируется молча, иначе описание просто пропало бы из виду.
    /// Файл, который пишет экспорт, читается импортом целиком: описание всех
    /// четырёх видов параметров с их привязками к переменным, документ тела с
    /// примечаниями, ответы и наборы «Try it» вместе с заголовками и куками.
    #[tokio::test]
    async fn everything_the_export_writes_comes_back_on_import() {
        let pool = db().await;
        let doc_id = imported_doc(
            &pool,
            ImportDoc {
                name: "Task API".into(),
                prefix: "/api/v1".into(),
            },
        )
        .await;

        let group: CreateGroupDTO = serde_json::from_value(serde_json::json!({
            "label": "Tasks",
            "endpoints": [{
                "method": "POST",
                "path": "/tasks/{taskId}",
                "name": "Create task",
                "description": "Заводит задачу",
                "auth": true,
                "pathParams": [
                    { "name": "taskId", "type": "uuid", "required": true, "desc": "UUID",
                      "value": "" }
                ],
                "queryParams": [
                    { "name": "dry", "type": "boolean", "required": false, "desc": "",
                      "value": "DRY_RUN" }
                ],
                "headerParams": [
                    { "name": "X-Request-Id", "type": "string", "required": false,
                      "desc": "id", "value": "" }
                ],
                "cookieParams": [
                    { "name": "sid", "type": "string", "required": true, "desc": "Сессия",
                      "value": "" }
                ],
                "body": { "title": "", "meta": { "labels": [] } },
                "bodyFields": [
                    { "path": "title", "desc": "Заголовок", "required": true, "format": "" }
                ],
                "responses": {
                    "201": {
                        "label": "201 Created",
                        "body": { "id": "" },
                        "fields": [
                            { "path": "id", "desc": "UUID", "required": true, "format": "uuid" }
                        ]
                    }
                },
                "requests": [{
                    "name": "Боевой",
                    "bodyMode": "fields",
                    "body": { "title": "Релиз" },
                    "headers": [
                        { "name": "Idempotency-Key", "value": "abc-1", "enabled": true }
                    ],
                    "cookies": [
                        { "name": "sid", "value": "{{SESSION}}", "enabled": true },
                        { "name": "debug", "value": "1", "enabled": false }
                    ],
                    "path": { "taskId": "42" },
                    "query": { "dry": "true" }
                }]
            }]
        }))
        .unwrap();

        GroupRepo::new(&pool)
            .create(&doc_id, &[group])
            .await
            .unwrap();

        let endpoint_id: String = sqlx::query_scalar(
            "SELECT e.id FROM endpoint e JOIN \"group\" g ON g.id = e.group_id WHERE g.doc_id = ?",
        )
        .bind(&doc_id)
        .fetch_one(&pool)
        .await
        .unwrap();

        // Параметры всех четырёх видов — вместе с привязкой к переменной.
        let params: Vec<(String, String, String)> = sqlx::query_as(
            "SELECT kind, name, value FROM endpoint_param WHERE endpoint_id = ? \
             ORDER BY kind, name",
        )
        .bind(&endpoint_id)
        .fetch_all(&pool)
        .await
        .unwrap();
        assert_eq!(
            params,
            vec![
                ("cookie".into(), "sid".into(), String::new()),
                ("header".into(), "X-Request-Id".into(), String::new()),
                ("path".into(), "taskId".into(), String::new()),
                ("query".into(), "dry".into(), "DRY_RUN".into()),
            ]
        );

        // Тело документом и примечание к его полю.
        let body: String = sqlx::query_scalar("SELECT body FROM endpoint WHERE id = ?")
            .bind(&endpoint_id)
            .fetch_one(&pool)
            .await
            .unwrap();
        assert_eq!(
            serde_json::from_str::<serde_json::Value>(&body).unwrap(),
            serde_json::json!({ "title": "", "meta": { "labels": [] } })
        );
        let note: String = sqlx::query_scalar(
            "SELECT desc FROM endpoint_body_field WHERE endpoint_id = ? AND path = 'title'",
        )
        .bind(&endpoint_id)
        .fetch_one(&pool)
        .await
        .unwrap();
        assert_eq!(note, "Заголовок");

        // Набор «Try it»: заголовки, куки и значения частей запроса.
        let stored = EndpointRequestRepo::new(&pool)
            .list(&endpoint_id)
            .await
            .unwrap();
        assert_eq!(stored.len(), 1);
        assert_eq!(stored[0].headers[0].name, "Idempotency-Key");
        assert_eq!(stored[0].cookies.len(), 2);
        assert_eq!(stored[0].cookies[0].value, "{{SESSION}}");
        assert!(
            !stored[0].cookies[1].enabled,
            "выключенная кука переживает круговой рейс"
        );

        let value = |kind: &str, name: &str| {
            stored[0]
                .values
                .iter()
                .find(|v| v.kind == kind && v.name == name)
                .map(|v| v.value.as_str())
        };
        assert_eq!(value("path", "taskId"), Some("42"));
        assert_eq!(value("query", "dry"), Some("true"));
    }

    #[tokio::test]
    async fn a_path_param_that_is_not_in_the_path_stops_the_import() {
        let raw = r#"{
            "doc": { "name": "My API" },
            "groups": [{ "label": "Default", "endpoints": [{
                "method": "GET", "path": "/posts/{postId}", "name": "Post", "description": "",
                "pathParams": [
                    { "name": "postid", "type": "uuid", "required": true, "desc": "", "default": "" }
                ],
                "responses": {}
            }]}]
        }"#;
        let file: ImportFile = serde_json::from_str(raw).unwrap();

        let pool = db().await;
        let doc_id = imported_doc(&pool, file.doc).await;
        let err = GroupRepo::new(&pool)
            .create(&doc_id, &file.groups)
            .await
            .unwrap_err();

        assert!(err.contains("postid"), "невнятная подсказка: {err}");
    }

    /// Файл без секции `requests` (старый формат) импортируется как раньше.
    #[tokio::test]
    async fn a_file_without_requests_still_imports() {
        let raw = r#"{
            "doc": { "name": "My API" },
            "groups": [{ "label": "Default", "endpoints": [{
                "method": "GET", "path": "/ping", "name": "Ping", "description": "",
                "auth": false, "queryParams": [], "bodyParams": [], "responses": {}
            }]}]
        }"#;
        let file: ImportFile = serde_json::from_str(raw).unwrap();

        let pool = db().await;
        let doc_id = imported_doc(&pool, file.doc).await;
        GroupRepo::new(&pool)
            .create(&doc_id, &file.groups)
            .await
            .unwrap();

        let total: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM endpoint_requests")
            .fetch_one(&pool)
            .await
            .unwrap();
        assert_eq!(total, 0);
    }
}
