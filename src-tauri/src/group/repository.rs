use crate::endpoint::model::{Endpoint, ParamDef, ResponseDef, ResponseSchemaField};
use crate::endpoint::repository::EndpointRepo;
use super::model::{CreateGroup, Group};
use sqlx::{Row, SqlitePool};
use std::collections::HashMap;
use uuid::Uuid;

pub trait GroupRepository {
    async fn all(&self, doc_id: &str) -> Result<Vec<Group>, String>;
    async fn create(&self, doc_id: &str, groups: &[CreateGroup]) -> Result<(), String>;
}

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

                let query_params: Vec<ParamDef> = param_rows
                    .iter()
                    .filter(|p| {
                        p.get::<String, _>("endpoint_id") == eid
                            && p.get::<String, _>("kind") == "query"
                    })
                    .map(|p| ParamDef {
                        name: p.get("name"),
                        type_: p.get("type"),
                        required: p.get::<i64, _>("required") != 0,
                        desc: p.get("desc"),
                        default: p.get("default_val"),
                    })
                    .collect();

                let body_params: Vec<ParamDef> = param_rows
                    .iter()
                    .filter(|p| {
                        p.get::<String, _>("endpoint_id") == eid
                            && p.get::<String, _>("kind") == "body"
                    })
                    .map(|p| ParamDef {
                        name: p.get("name"),
                        type_: p.get("type"),
                        required: p.get::<i64, _>("required") != 0,
                        desc: p.get("desc"),
                        default: p.get("default_val"),
                    })
                    .collect();

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

    async fn create(&self, doc_id: &str, groups: &[CreateGroup]) -> Result<(), String> {
        for (gi, group) in groups.iter().enumerate() {
            let group_id = self.insert_group(doc_id, group, gi).await?;
            let endpoint_repo = EndpointRepo::new(self.db);
            for (ei, endpoint) in group.endpoints.iter().enumerate() {
                endpoint_repo.create(&group_id, endpoint, ei).await?;
            }
        }
        Ok(())
    }
}

impl GroupRepo<'_> {
    async fn insert_group(&self, doc_id: &str, group: &CreateGroup, sort_ord: usize) -> Result<String, String> {
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
