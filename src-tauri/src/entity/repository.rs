use super::model::{CreateEntity, Entity, EntityField, EnumValue};
use sqlx::{Row, SqlitePool};
use uuid::Uuid;

pub trait EntityRepository {
    async fn all(&self, doc_id: &str) -> Result<Vec<Entity>, String>;
    async fn create(&self, doc_id: &str, schemas: &[CreateEntity]) -> Result<(), String>;
}

pub struct EntityRepo<'a> {
    pub db: &'a SqlitePool,
}

impl<'a> EntityRepo<'a> {
    pub fn new(db: &'a SqlitePool) -> Self {
        Self { db }
    }
}

impl EntityRepository for EntityRepo<'_> {
    async fn all(&self, doc_id: &str) -> Result<Vec<Entity>, String> {
        read_schemas(self.db, doc_id).await
    }

    async fn create(&self, doc_id: &str, schemas: &[CreateEntity]) -> Result<(), String> {
        write_schemas(self.db, doc_id, schemas).await
    }
}

async fn read_schemas(db: &SqlitePool, doc_id: &str) -> Result<Vec<Entity>, String> {
    let entity_rows = sqlx::query("SELECT * FROM entities WHERE doc_id = ?")
        .bind(doc_id)
        .fetch_all(db)
        .await
        .map_err(|e| e.to_string())?;

    if entity_rows.is_empty() {
        return Ok(vec![]);
    }

    let entity_ids: Vec<String> = entity_rows.iter().map(|r| r.get("id")).collect();

    let mut fq = sqlx::QueryBuilder::new("SELECT * FROM entity_field WHERE entity_id IN (");
    let mut sep = fq.separated(",");
    for id in &entity_ids {
        sep.push_bind(id);
    }
    fq.push(") ORDER BY sort_ord");

    let field_rows = fq
        .build()
        .fetch_all(db)
        .await
        .map_err(|e| e.to_string())?;

    let field_ids: Vec<i64> = field_rows.iter().map(|r| r.get("id")).collect();

    let enum_rows = if field_ids.is_empty() {
        vec![]
    } else {
        let mut eq =
            sqlx::QueryBuilder::new("SELECT * FROM entity_field_enum WHERE field_id IN (");
        let mut sep = eq.separated(",");
        for id in &field_ids {
            sep.push_bind(id);
        }
        eq.push(")");

        eq.build()
            .fetch_all(db)
            .await
            .map_err(|e| e.to_string())?
    };

    Ok(entity_rows
        .iter()
        .map(|s| {
            let eid: String = s.get("id");

            let fields: Vec<EntityField> = field_rows
                .iter()
                .filter(|f| f.get::<String, _>("entity_id") == eid)
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

            Entity {
                id: eid,
                name: s.get("name"),
                desc: s.get("desc"),
                fields,
            }
        })
        .collect())
}

async fn write_schemas(
    db: &SqlitePool,
    doc_id: &str,
    schemas: &[CreateEntity],
) -> Result<(), String> {
    for schema in schemas {
        let entity_id = Uuid::new_v4().to_string();

        sqlx::query("INSERT INTO entities (id, doc_id, name, desc) VALUES (?, ?, ?, ?)")
            .bind(&entity_id)
            .bind(doc_id)
            .bind(&schema.name)
            .bind(&schema.desc)
            .execute(db)
            .await
            .map_err(|e| e.to_string())?;

        for (fi, field) in schema.fields.iter().enumerate() {
            let result = sqlx::query(
                "INSERT INTO entity_field \
                 (entity_id, name, type, required, nullable, desc, note, example, sort_ord) \
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            )
            .bind(&entity_id)
            .bind(&field.name)
            .bind(&field.type_)
            .bind(if field.req { 1i64 } else { 0i64 })
            .bind(if field.nullable { 1i64 } else { 0i64 })
            .bind(&field.desc)
            .bind(&field.note)
            .bind(&field.example)
            .bind(fi as i64)
            .execute(db)
            .await
            .map_err(|e| e.to_string())?;

            let field_id = result.last_insert_rowid();

            for enum_val in &field.enum_ {
                sqlx::query(
                    "INSERT INTO entity_field_enum (field_id, val, desc) VALUES (?, ?, ?)",
                )
                .bind(field_id)
                .bind(&enum_val.val)
                .bind(&enum_val.desc)
                .execute(db)
                .await
                .map_err(|e| e.to_string())?;
            }
        }

    }

    Ok(())
}
