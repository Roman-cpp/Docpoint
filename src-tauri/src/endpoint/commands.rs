use crate::state::AppState;
use super::model::{Endpoint, Group, ParamDef, ResponseDef, ResponseSchemaField};
use sqlx::Row;
use std::collections::HashMap;
use tauri::State;

#[tauri::command]
pub async fn db_read_groups(
    state: State<'_, AppState>,
    doca_id: String,
) -> Result<Vec<Group>, String> {
    let group_rows = sqlx::query(
        "SELECT * FROM endpoint_group WHERE doca_id = ? ORDER BY sort_ord",
    )
    .bind(&doca_id)
    .fetch_all(&state.db)
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
        .fetch_all(&state.db)
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
        pq.build().fetch_all(&state.db),
        tq.build().fetch_all(&state.db),
        rq.build().fetch_all(&state.db),
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
            .fetch_all(&state.db)
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

#[tauri::command]
pub async fn db_write_groups(
    state: State<'_, AppState>,
    doca_id: String,
    groups: Vec<Group>,
) -> Result<(), String> {
    sqlx::query("DELETE FROM endpoint_group WHERE doca_id = ?")
        .bind(&doca_id)
        .execute(&state.db)
        .await
        .map_err(|e| e.to_string())?;

    for (gi, group) in groups.iter().enumerate() {
        sqlx::query(
            "INSERT INTO endpoint_group (id, doca_id, label, sort_ord) VALUES (?, ?, ?, ?)",
        )
        .bind(&group.id)
        .bind(&doca_id)
        .bind(&group.label)
        .bind(gi as i64)
        .execute(&state.db)
        .await
        .map_err(|e| e.to_string())?;

        for (ei, endpoint) in group.endpoints.iter().enumerate() {
            sqlx::query(
                "INSERT INTO endpoint (id, group_id, method, path, name, description, auth, sort_ord) \
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            )
            .bind(&endpoint.id)
            .bind(&group.id)
            .bind(&endpoint.method)
            .bind(&endpoint.path)
            .bind(&endpoint.name)
            .bind(&endpoint.description)
            .bind(if endpoint.auth { 1i64 } else { 0i64 })
            .bind(ei as i64)
            .execute(&state.db)
            .await
            .map_err(|e| e.to_string())?;

            for tag in &endpoint.tags {
                sqlx::query("INSERT INTO endpoint_tag (endpoint_id, tag) VALUES (?, ?)")
                    .bind(&endpoint.id)
                    .bind(tag)
                    .execute(&state.db)
                    .await
                    .map_err(|e| e.to_string())?;
            }

            for (pi, param) in endpoint.query_params.iter().enumerate() {
                sqlx::query(
                    "INSERT INTO param (endpoint_id, kind, name, type, required, desc, default_val, sort_ord) \
                     VALUES (?, 'query', ?, ?, ?, ?, ?, ?)",
                )
                .bind(&endpoint.id)
                .bind(&param.name)
                .bind(&param.type_)
                .bind(if param.required { 1i64 } else { 0i64 })
                .bind(&param.desc)
                .bind(&param.default)
                .bind(pi as i64)
                .execute(&state.db)
                .await
                .map_err(|e| e.to_string())?;
            }

            for (pi, param) in endpoint.body_params.iter().enumerate() {
                sqlx::query(
                    "INSERT INTO param (endpoint_id, kind, name, type, required, desc, default_val, sort_ord) \
                     VALUES (?, 'body', ?, ?, ?, ?, ?, ?)",
                )
                .bind(&endpoint.id)
                .bind(&param.name)
                .bind(&param.type_)
                .bind(if param.required { 1i64 } else { 0i64 })
                .bind(&param.desc)
                .bind(&param.default)
                .bind(pi as i64)
                .execute(&state.db)
                .await
                .map_err(|e| e.to_string())?;
            }

            for (status_code, resp) in &endpoint.responses {
                let result = sqlx::query(
                    "INSERT INTO response (endpoint_id, status_code, label, example) \
                     VALUES (?, ?, ?, ?)",
                )
                .bind(&endpoint.id)
                .bind(status_code)
                .bind(&resp.label)
                .bind(&resp.example)
                .execute(&state.db)
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
                    .execute(&state.db)
                    .await
                    .map_err(|e| e.to_string())?;
                }
            }
        }
    }

    Ok(())
}
