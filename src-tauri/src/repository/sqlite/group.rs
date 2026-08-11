use crate::domain::doc_api::endpoint::entity::{Endpoint, ParamDef, ResponseDef, ResponseSchemaField};
use crate::domain::doc_api::endpoint::repository::EndpointRepository;
use crate::repository::sqlite::endpoint::EndpointRepo;
use crate::domain::doc_api::endpoint_request::repository::{
    EndpointRequestRepository, RequestTarget,
};
use crate::repository::sqlite::endpoint_request::EndpointRequestRepo;
use crate::domain::doc_api::group::dto::CreateGroupDTO;
use crate::domain::doc_api::group::entity::Group;
use sqlx::{Row, SqlitePool};
use std::collections::HashMap;
use uuid::Uuid;
use crate::domain::doc_api::group::repository::GroupRepository;

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
        let group_rows = sqlx::query(
            r#"SELECT * FROM "group" WHERE doc_id = ? ORDER BY sort_ord"#,
        )
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

        let endpoint_rows = eq
            .build()
            .fetch_all(db)
            .await
            .map_err(|e| e.to_string())?;

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

        let mut pq = sqlx::QueryBuilder::new("SELECT * FROM param WHERE endpoint_id IN (");
        let mut sep = pq.separated(",");
        for id in &endpoint_ids {
            sep.push_bind(id);
        }
        pq.push(") ORDER BY sort_ord");

        let mut tq = sqlx::QueryBuilder::new("SELECT * FROM endpoint_tag WHERE endpoint_id IN (");
        let mut sep = tq.separated(",");
        for id in &endpoint_ids {
            sep.push_bind(id);
        }
        tq.push(")");

        let mut rq = sqlx::QueryBuilder::new("SELECT * FROM response WHERE endpoint_id IN (");
        let mut sep = rq.separated(",");
        for id in &endpoint_ids {
            sep.push_bind(id);
        }
        rq.push(")");

        let (param_rows, tag_rows, response_rows) = tokio::try_join!(
            pq.build().fetch_all(db),
            tq.build().fetch_all(db),
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

            rfq.build()
                .fetch_all(db)
                .await
                .map_err(|e| e.to_string())?
        };

        let endpoint_group_map: HashMap<String, String> = endpoint_rows
            .iter()
            .map(|r| (r.get::<String, _>("id"), r.get::<String, _>("group_id")))
            .collect();

        let endpoints: Vec<Endpoint> = endpoint_rows
            .iter()
            .map(|e| {
                let eid: String = e.get("id");

                let tags: Vec<String> = tag_rows
                    .iter()
                    .filter(|t| t.get::<String, _>("endpoint_id") == eid)
                    .map(|t| t.get("tag"))
                    .collect();

                let params_of = |kind: &str| -> Vec<ParamDef> {
                    param_rows
                        .iter()
                        .filter(|p| {
                            p.get::<String, _>("endpoint_id") == eid
                                && p.get::<String, _>("kind") == kind
                        })
                        .map(|p| ParamDef {
                            name: p.get("name"),
                            type_: p.get("type"),
                            required: p.get::<i64, _>("required") != 0,
                            desc: p.get("desc"),
                            default: p.get("default_val"),
                            value: p.get("value"),
                        })
                        .collect()
                };

                let path_params = params_of("path");
                let query_params = params_of("query");
                let body_params = params_of("body");

                let mut responses: HashMap<String, ResponseDef> = HashMap::new();
                for resp in response_rows
                    .iter()
                    .filter(|r| r.get::<String, _>("endpoint_id") == eid)
                {
                    let rid: i64 = resp.get("id");
                    let fields: Vec<ResponseSchemaField> = response_field_rows
                        .iter()
                        .filter(|f| f.get::<i64, _>("response_id") == rid)
                        .map(|f| ResponseSchemaField {
                            key: f.get("key"),
                            type_: f.get("type"),
                            desc: f.get("desc"),
                            example: f.get("example"),
                        })
                        .collect();

                    responses.insert(
                        resp.get("status_code"),
                        ResponseDef {
                            label: resp.get("label"),
                            schema: fields,
                            example: resp.get("example"),
                        },
                    );
                }

                Endpoint {
                    id: eid,
                    method: e.get("method"),
                    path: e.get("path"),
                    name: e.get("name"),
                    description: e.get("description"),
                    tags,
                    auth: e.get::<i64, _>("auth") != 0,
                    path_params,
                    query_params,
                    body_params,
                    responses,
                }
            })
            .collect();

        let mut endpoint_by_group: HashMap<String, Vec<Endpoint>> = HashMap::new();
        for endpoint in endpoints {
            if let Some(gid) = endpoint_group_map.get(&endpoint.id) {
                endpoint_by_group.entry(gid.clone()).or_default().push(endpoint);
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

    async fn create(&self, doc_id: &str, groups: &[CreateGroupDTO]) -> Result<(), String> {
        for (gi, group) in groups.iter().enumerate() {
            let group_id = self.insert_group(doc_id, group, gi).await?;
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
        let sort_ord: i64 =
            sqlx::query_scalar(r#"SELECT COUNT(*) FROM "group" WHERE doc_id = ?"#)
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

    async fn insert_group(&self, doc_id: &str, group: &CreateGroupDTO, sort_ord: usize) -> Result<String, String> {
        let group_id = Uuid::new_v4().to_string();

        sqlx::query(
            r#"INSERT INTO "group" (id, doc_id, label, sort_ord) VALUES (?, ?, ?, ?)"#,
        )
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
    use crate::domain::doc_api::doc_api::dto::CreateDocApiDTO;
    use crate::domain::doc_api::doc_api::repository::DocRepository;
    use crate::repository::sqlite::doc_api::DocRepo;
    use serde::Deserialize;
    use sqlx::sqlite::SqlitePoolOptions;

    /// Ровно то, что читает команда `import_doc`.
    #[derive(Deserialize)]
    struct ImportFile {
        doc: CreateDocApiDTO,
        groups: Vec<CreateGroupDTO>,
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
        let raw = include_str!("../../../../docs/import/doc-api-example-import.json");
        let file: ImportFile = serde_json::from_str(raw).expect("пример не разбирается");

        let pool = db().await;
        let doc_id = DocRepo::new(&pool).create(&file.doc).await.unwrap();
        GroupRepo::new(&pool).create(&doc_id, &file.groups).await.unwrap();

        // Наборы легли на свои эндпоинты, а не куда попало.
        let login_id: String = sqlx::query_scalar(
            "SELECT id FROM endpoint WHERE path = '/auth/login' AND method = 'POST'",
        )
        .fetch_one(&pool)
        .await
        .unwrap();

        let login = EndpointRequestRepo::new(&pool).list(&login_id).await.unwrap();
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
        let tasks = EndpointRequestRepo::new(&pool).list(&create_task_id).await.unwrap();
        let nested: serde_json::Value = serde_json::from_str(&tasks[0].body).unwrap();
        assert_eq!(nested["title"], "Подготовить релиз");
        assert_eq!(nested["meta"]["labels"][0], "release");
        assert_eq!(nested["meta"]["estimate"]["value"], 8);
        assert_eq!(tasks[0].headers[0].name, "Idempotency-Key");

        // Тело-строка остаётся дословно, без попытки разобрать его как JSON.
        assert_eq!(tasks[2].body, "title=Подготовить релиз&priority=high");

        // Выключенный заголовок сохраняется именно выключенным.
        let delete_user_id: String = sqlx::query_scalar(
            "SELECT id FROM endpoint WHERE path = '/users/{id}' AND method = 'DELETE'",
        )
        .fetch_one(&pool)
        .await
        .unwrap();
        let del = EndpointRequestRepo::new(&pool).list(&delete_user_id).await.unwrap();
        assert!(!del[0].headers[0].enabled);
        assert!(del[0].values.iter().any(|v| v.kind == "path" && v.name == "id"));

        // Набор, где заданы все части запроса разом: сегмент пути, строка
        // запроса, заголовок и тело.
        let patch_task_id: String = sqlx::query_scalar(
            "SELECT id FROM endpoint WHERE path = '/tasks/{id}' AND method = 'PATCH'",
        )
        .fetch_one(&pool)
        .await
        .unwrap();
        let patch = EndpointRequestRepo::new(&pool).list(&patch_task_id).await.unwrap();
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
        assert!(patch[0].headers[0].enabled, "объект задаёт включённые заголовки");
        let patch_body: serde_json::Value = serde_json::from_str(&patch[0].body).unwrap();
        assert_eq!(patch_body["status"], "done");

        // Описания сегментов пути доезжают вместе со схемой эндпоинта.
        let described: Vec<(String, String, String)> = sqlx::query_as(
            "SELECT name, type, desc FROM param \
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

        // Эндпоинты без секции `requests` остаются без наборов.
        let total: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM endpoint_requests")
            .fetch_one(&pool)
            .await
            .unwrap();
        assert_eq!(total, 12);
    }

    /// Описание сегмента, которого нет в пути, — опечатка: такой эндпоинт
    /// не импортируется молча, иначе описание просто пропало бы из виду.
    #[tokio::test]
    async fn a_path_param_that_is_not_in_the_path_stops_the_import() {
        let raw = r#"{
            "doc": { "name": "My API", "version": "v1", "desc": "d", "tags": [] },
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
        let doc_id = DocRepo::new(&pool).create(&file.doc).await.unwrap();
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
            "doc": { "name": "My API", "version": "v1", "desc": "d", "tags": [] },
            "groups": [{ "label": "Default", "endpoints": [{
                "method": "GET", "path": "/ping", "name": "Ping", "description": "",
                "tags": [], "auth": false, "queryParams": [], "bodyParams": [], "responses": {}
            }]}]
        }"#;
        let file: ImportFile = serde_json::from_str(raw).unwrap();

        let pool = db().await;
        let doc_id = DocRepo::new(&pool).create(&file.doc).await.unwrap();
        GroupRepo::new(&pool).create(&doc_id, &file.groups).await.unwrap();

        let total: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM endpoint_requests")
            .fetch_one(&pool)
            .await
            .unwrap();
        assert_eq!(total, 0);
    }
}
