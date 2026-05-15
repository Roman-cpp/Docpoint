use crate::state::AppState;
use super::model::{Entity, EntityField, EnumValue, UsedByItem};
use sqlx::Row;
use tauri::State;

#[tauri::command]
pub async fn db_read_schemas(
    state: State<'_, AppState>,
    doca_id: String,
) -> Result<Vec<Entity>, String> {
    let schema_rows = sqlx::query(r#"SELECT * FROM "schema" WHERE doca_id = ?"#)
        .bind(&doca_id)
        .fetch_all(&state.db)
        .await
        .map_err(|e| e.to_string())?;

    if schema_rows.is_empty() {
        return Ok(vec![]);
    }

    let schema_ids: Vec<String> = schema_rows.iter().map(|r| r.get("id")).collect();

    let mut fq = sqlx::QueryBuilder::new("SELECT * FROM schema_field WHERE schema_id IN (");
    let mut sep = fq.separated(",");
    for id in &schema_ids {
        sep.push_bind(id);
    }
    fq.push(") ORDER BY sort_ord");

    let mut uq = sqlx::QueryBuilder::new("SELECT * FROM schema_used_by WHERE schema_id IN (");
    let mut sep = uq.separated(",");
    for id in &schema_ids {
        sep.push_bind(id);
    }
    uq.push(")");

    let (field_rows, used_by_rows) = tokio::try_join!(
        fq.build().fetch_all(&state.db),
        uq.build().fetch_all(&state.db),
    )
    .map_err(|e| e.to_string())?;

    let field_ids: Vec<i64> = field_rows.iter().map(|r| r.get("id")).collect();

    let enum_rows = if field_ids.is_empty() {
        vec![]
    } else {
        let mut eq =
            sqlx::QueryBuilder::new("SELECT * FROM schema_field_enum WHERE field_id IN (");
        let mut sep = eq.separated(",");
        for id in &field_ids {
            sep.push_bind(id);
        }
        eq.push(")");

        eq.build()
            .fetch_all(&state.db)
            .await
            .map_err(|e| e.to_string())?
    };

    Ok(schema_rows
        .iter()
        .map(|s| {
            let sid: String = s.get("id");

            let fields: Vec<EntityField> = field_rows
                .iter()
                .filter(|f| f.get::<String, _>("schema_id") == sid)
                .map(|f| {
                    let fid: i64 = f.get("id");
                    let enum_vals: Vec<EnumValue> = enum_rows
                        .iter()
                        .filter(|e| e.get::<i64, _>("field_id") == fid)
                        .map(|e| EnumValue {
                            val: e.get("val"),
                            desc: e.get("desc"),
                        })
                        .collect();

                    EntityField {
                        name: f.get("name"),
                        type_: f.get("type"),
                        req: f.get::<i64, _>("required") != 0,
                        nullable: f.get::<i64, _>("nullable") != 0,
                        desc: f.get("desc"),
                        note: f.get("note"),
                        example: f.get("example"),
                        enum_: enum_vals,
                    }
                })
                .collect();

            let used_by: Vec<UsedByItem> = used_by_rows
                .iter()
                .filter(|u| u.get::<String, _>("schema_id") == sid)
                .map(|u| UsedByItem {
                    method: u.get("method"),
                    path: u.get("path"),
                    role: u.get("role"),
                })
                .collect();

            Entity {
                id: sid,
                name: s.get("name"),
                desc: s.get("desc"),
                fields,
                used_by,
            }
        })
        .collect())
}

#[tauri::command]
pub async fn db_write_schemas(
    state: State<'_, AppState>,
    doca_id: String,
    schemas: Vec<Entity>,
) -> Result<(), String> {
    sqlx::query(r#"DELETE FROM "schema" WHERE doca_id = ?"#)
        .bind(&doca_id)
        .execute(&state.db)
        .await
        .map_err(|e| e.to_string())?;

    for schema in &schemas {
        sqlx::query(r#"INSERT INTO "schema" (id, doca_id, name, desc) VALUES (?, ?, ?, ?)"#)
            .bind(&schema.id)
            .bind(&doca_id)
            .bind(&schema.name)
            .bind(&schema.desc)
            .execute(&state.db)
            .await
            .map_err(|e| e.to_string())?;

        for (fi, field) in schema.fields.iter().enumerate() {
            let result = sqlx::query(
                "INSERT INTO schema_field \
                 (schema_id, name, type, required, nullable, desc, note, example, sort_ord) \
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            )
            .bind(&schema.id)
            .bind(&field.name)
            .bind(&field.type_)
            .bind(if field.req { 1i64 } else { 0i64 })
            .bind(if field.nullable { 1i64 } else { 0i64 })
            .bind(&field.desc)
            .bind(&field.note)
            .bind(&field.example)
            .bind(fi as i64)
            .execute(&state.db)
            .await
            .map_err(|e| e.to_string())?;

            let field_id = result.last_insert_rowid();

            for enum_val in &field.enum_ {
                sqlx::query(
                    "INSERT INTO schema_field_enum (field_id, val, desc) VALUES (?, ?, ?)",
                )
                .bind(field_id)
                .bind(&enum_val.val)
                .bind(&enum_val.desc)
                .execute(&state.db)
                .await
                .map_err(|e| e.to_string())?;
            }
        }

        for used_by in &schema.used_by {
            sqlx::query(
                "INSERT INTO schema_used_by (schema_id, method, path, role) VALUES (?, ?, ?, ?)",
            )
            .bind(&schema.id)
            .bind(&used_by.method)
            .bind(&used_by.path)
            .bind(&used_by.role)
            .execute(&state.db)
            .await
            .map_err(|e| e.to_string())?;
        }
    }

    Ok(())
}
