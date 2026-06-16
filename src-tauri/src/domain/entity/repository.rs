use super::model::{CreateEntityDTO, Entity, EntityField, EnumValue, UpdateEntityDTO};
use sqlx::{Row, SqlitePool};
use uuid::Uuid;

pub trait EntityRepository {
    async fn all(&self, doc_id: &str) -> Result<Vec<Entity>, String>;
    async fn all_by_erd(&self, doc_erd_id: &str) -> Result<Vec<Entity>, String>;
    async fn create(&self, doc_id: &str, schema: &CreateEntityDTO) -> Result<String, String>;
    async fn create_for_erd(
        &self,
        doc_erd_id: &str,
        schema: &CreateEntityDTO,
    ) -> Result<String, String>;
    async fn update(&self, schema: &UpdateEntityDTO) -> Result<(), String>;
    async fn delete(&self, entity_id: &str) -> Result<(), String>;
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
        read_schemas_by(self.db, "doc_id", doc_id).await
    }

    async fn all_by_erd(&self, doc_erd_id: &str) -> Result<Vec<Entity>, String> {
        read_schemas_by(self.db, "doc_erd_id", doc_erd_id).await
    }

    async fn create(&self, doc_id: &str, schema: &CreateEntityDTO) -> Result<String, String> {
        insert_schema(self.db, EntityOwner::Doc(doc_id), schema).await
    }

    async fn create_for_erd(
        &self,
        doc_erd_id: &str,
        schema: &CreateEntityDTO,
    ) -> Result<String, String> {
        insert_schema(self.db, EntityOwner::Erd(doc_erd_id), schema).await
    }

    async fn update(&self, schema: &UpdateEntityDTO) -> Result<(), String> {
        update_schema(self.db, schema).await
    }

    async fn delete(&self, entity_id: &str) -> Result<(), String> {
        delete_schema(self.db, entity_id).await
    }
}

/// Which side an entity is attached to. Entities created from an API doc carry
/// a `doc_id`; entities drawn on an ERD canvas carry a `doc_erd_id` and no doc.
enum EntityOwner<'a> {
    Doc(&'a str),
    Erd(&'a str),
}

/// Loads entities (with fields and enum values) filtered by a single owner
/// column. `column` is a trusted literal (`"doc_id"` / `"doc_erd_id"`), never
/// user input, so interpolating it into the SQL is safe.
async fn read_schemas_by(
    db: &SqlitePool,
    column: &str,
    value: &str,
) -> Result<Vec<Entity>, String> {
    let entity_rows = sqlx::query(&format!("SELECT * FROM entities WHERE {column} = ?"))
        .bind(value)
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
                        pk: f.get::<i64, _>("is_pk") != 0,
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

/// Вставляет одну entity вместе с полями и enum-значениями, возвращает её id.
async fn insert_schema(
    db: &SqlitePool,
    owner: EntityOwner<'_>,
    schema: &CreateEntityDTO,
) -> Result<String, String> {
    let entity_id = Uuid::new_v4().to_string();

    let (doc_id, doc_erd_id) = match owner {
        EntityOwner::Doc(id) => (Some(id), None),
        EntityOwner::Erd(id) => (None, Some(id)),
    };

    sqlx::query("INSERT INTO entities (id, doc_id, doc_erd_id, name, desc) VALUES (?, ?, ?, ?, ?)")
        .bind(&entity_id)
        .bind(doc_id)
        .bind(doc_erd_id)
        .bind(&schema.name)
        .bind(&schema.desc)
        .execute(db)
        .await
        .map_err(|e| e.to_string())?;

    for (fi, field) in schema.fields.iter().enumerate() {
        let result = sqlx::query(
            "INSERT INTO entity_field \
             (entity_id, name, type, required, nullable, is_pk, desc, note, example, sort_ord) \
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        )
        .bind(&entity_id)
        .bind(&field.name)
        .bind(&field.type_)
        .bind(if field.req { 1i64 } else { 0i64 })
        .bind(if field.nullable { 1i64 } else { 0i64 })
        .bind(if field.pk { 1i64 } else { 0i64 })
        .bind(&field.desc)
        .bind(&field.note)
        .bind(&field.example)
        .bind(fi as i64)
        .execute(db)
        .await
        .map_err(|e| e.to_string())?;

        let field_id = result.last_insert_rowid();

        for enum_val in &field.enum_ {
            sqlx::query("INSERT INTO entity_field_enum (field_id, val, desc) VALUES (?, ?, ?)")
                .bind(field_id)
                .bind(&enum_val.val)
                .bind(&enum_val.desc)
                .execute(db)
                .await
                .map_err(|e| e.to_string())?;
        }
    }

    Ok(entity_id)
}

async fn delete_schema(db: &SqlitePool, entity_id: &str) -> Result<(), String> {
    let mut conn = db.acquire().await.map_err(|e| e.to_string())?;

    // Зависимые поля и enum-значения удаляются через ON DELETE CASCADE.
    sqlx::query("PRAGMA foreign_keys = ON")
        .execute(&mut *conn)
        .await
        .map_err(|e| e.to_string())?;

    sqlx::query("DELETE FROM entities WHERE id = ?")
        .bind(entity_id)
        .execute(&mut *conn)
        .await
        .map_err(|e| e.to_string())?;

    Ok(())
}

async fn update_schema(db: &SqlitePool, schema: &UpdateEntityDTO) -> Result<(), String> {
    let mut tx = db.begin().await.map_err(|e| e.to_string())?;

    sqlx::query("UPDATE entities SET name = ?, desc = ? WHERE id = ?")
        .bind(&schema.name)
        .bind(&schema.desc)
        .bind(&schema.id)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

    // Поля редактируемые целиком, поэтому пересоздаём их вместе с enum-значениями.
    sqlx::query(
        "DELETE FROM entity_field_enum \
         WHERE field_id IN (SELECT id FROM entity_field WHERE entity_id = ?)",
    )
    .bind(&schema.id)
    .execute(&mut *tx)
    .await
    .map_err(|e| e.to_string())?;

    sqlx::query("DELETE FROM entity_field WHERE entity_id = ?")
        .bind(&schema.id)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

    for (fi, field) in schema.fields.iter().enumerate() {
        let result = sqlx::query(
            "INSERT INTO entity_field \
             (entity_id, name, type, required, nullable, is_pk, desc, note, example, sort_ord) \
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        )
        .bind(&schema.id)
        .bind(&field.name)
        .bind(&field.type_)
        .bind(if field.req { 1i64 } else { 0i64 })
        .bind(if field.nullable { 1i64 } else { 0i64 })
        .bind(if field.pk { 1i64 } else { 0i64 })
        .bind(&field.desc)
        .bind(&field.note)
        .bind(&field.example)
        .bind(fi as i64)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

        let field_id = result.last_insert_rowid();

        for enum_val in &field.enum_ {
            sqlx::query("INSERT INTO entity_field_enum (field_id, val, desc) VALUES (?, ?, ?)")
                .bind(field_id)
                .bind(&enum_val.val)
                .bind(&enum_val.desc)
                .execute(&mut *tx)
                .await
                .map_err(|e| e.to_string())?;
        }
    }

    tx.commit().await.map_err(|e| e.to_string())?;

    Ok(())
}
