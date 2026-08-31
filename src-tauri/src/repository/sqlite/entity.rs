use crate::domain::doc_erd::entity::dto::{CreateEntityDTO, EntityPositionDTO, UpdateEntityDTO};
use crate::domain::doc_erd::entity::entity::{Entity, EntityField, EnumValue};
use sqlx::{Row, SqlitePool};
use uuid::Uuid;
use crate::domain::doc_erd::entity::repository::EntityRepository;

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

    async fn update_positions(&self, positions: &[EntityPositionDTO]) -> Result<(), String> {
        update_positions(self.db, positions).await
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
                pos_x: s.get("pos_x"),
                pos_y: s.get("pos_y"),
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

/// Записывает позиции таблиц одной транзакцией: холст сбрасывает сюда всю
/// накопленную пачку сразу, и либо приезжает вся раскладка, либо ничего.
async fn update_positions(db: &SqlitePool, positions: &[EntityPositionDTO]) -> Result<(), String> {
    if positions.is_empty() {
        return Ok(());
    }

    let mut tx = db.begin().await.map_err(|e| e.to_string())?;

    for pos in positions {
        sqlx::query("UPDATE entities SET pos_x = ?, pos_y = ? WHERE id = ?")
            .bind(pos.x)
            .bind(pos.y)
            .bind(&pos.id)
            .execute(&mut *tx)
            .await
            .map_err(|e| e.to_string())?;
    }

    tx.commit().await.map_err(|e| e.to_string())?;

    Ok(())
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

    // Связи адресуют колонки именами, а не id: переименованная и удалённая
    // колонка одинаково оставляют связь висеть в пустоте. Холст такую связь
    // молча не рисует, но строка остаётся в базе и «оживёт», если колонку с тем
    // же именем когда-нибудь заведут заново, — поэтому убираем её здесь же, в
    // одной транзакции с правкой полей.
    let mut cleanup = sqlx::QueryBuilder::new("DELETE FROM entity_relation WHERE (from_entity = ");
    cleanup.push_bind(&schema.id);
    cleanup.push(" AND from_field NOT IN (");
    let mut names = cleanup.separated(",");
    for field in &schema.fields {
        names.push_bind(&field.name);
    }
    // Пустой список полей формой не пропускается, но NOT IN () — синтаксическая
    // ошибка, поэтому подставляем заведомо несуществующее имя.
    if schema.fields.is_empty() {
        names.push_bind("");
    }
    cleanup.push(")) OR (to_entity = ");
    cleanup.push_bind(&schema.id);
    cleanup.push(" AND to_field NOT IN (");
    let mut names = cleanup.separated(",");
    for field in &schema.fields {
        names.push_bind(&field.name);
    }
    if schema.fields.is_empty() {
        names.push_bind("");
    }
    cleanup.push("))");

    cleanup
        .build()
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

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::doc_erd::entity::entity::EntityField;
    use crate::domain::doc_erd::entity_relation::dto::RelationEndpointsDTO;
    use crate::domain::doc_erd::entity_relation::repository::RelationRepository;
    use crate::repository::sqlite::entity_relation::RelationRepo;
    use crate::repository::sqlite::test_db;

    /// Платформа с ERD-узлом, к которому цепляются сущности.
    async fn db() -> SqlitePool {
        let pool = test_db::migrated().await;
        sqlx::query("INSERT INTO platforms (id, name) VALUES ('p1', 'P')")
            .execute(&pool)
            .await
            .unwrap();
        sqlx::query(
            "INSERT INTO catalog_node (id, platform_id, parent_id, kind, name) \
             VALUES ('erd1', 'p1', NULL, 'doc_erd', 'Схема')",
        )
        .execute(&pool)
        .await
        .unwrap();
        pool
    }

    fn field(name: &str) -> EntityField {
        EntityField {
            name: name.to_string(),
            type_: "int".into(),
            req: false,
            nullable: false,
            pk: false,
            desc: String::new(),
            note: String::new(),
            example: String::new(),
            enum_: vec![],
        }
    }

    fn schema(name: &str, fields: &[&str]) -> CreateEntityDTO {
        CreateEntityDTO {
            name: name.to_string(),
            desc: String::new(),
            fields: fields.iter().map(|f| field(f)).collect(),
        }
    }

    async fn relation_count(pool: &SqlitePool) -> i64 {
        sqlx::query_scalar("SELECT COUNT(*) FROM entity_relation")
            .fetch_one(pool)
            .await
            .unwrap()
    }

    /// Пара связанных таблиц: users.id → orders.user_id.
    async fn linked(pool: &SqlitePool) -> (String, String) {
        let repo = EntityRepo::new(pool);
        let users = repo
            .create_for_erd("erd1", &schema("users", &["id"]))
            .await
            .unwrap();
        let orders = repo
            .create_for_erd("erd1", &schema("orders", &["id", "user_id"]))
            .await
            .unwrap();

        RelationRepo::new(pool)
            .create(&RelationEndpointsDTO {
                from_entity: users.clone(),
                from_field: "id".into(),
                to_entity: orders.clone(),
                to_field: "user_id".into(),
            })
            .await
            .unwrap();

        (users, orders)
    }

    #[tokio::test]
    async fn renaming_a_column_takes_its_relations_with_it() {
        // Связь адресует колонку именем: после переименования ей не на что
        // указывать. Холст такую связь не рисует, но строка осталась бы в базе
        // и вернулась бы, заведи кто-нибудь колонку с прежним именем.
        let pool = db().await;
        let (_, orders) = linked(&pool).await;

        EntityRepo::new(&pool)
            .update(&UpdateEntityDTO {
                id: orders,
                name: "orders".into(),
                desc: String::new(),
                fields: vec![field("id"), field("owner_id")],
            })
            .await
            .unwrap();

        assert_eq!(relation_count(&pool).await, 0);
    }

    #[tokio::test]
    async fn a_relation_survives_edits_that_do_not_touch_its_columns() {
        let pool = db().await;
        let (_, orders) = linked(&pool).await;

        EntityRepo::new(&pool)
            .update(&UpdateEntityDTO {
                id: orders,
                name: "purchases".into(),
                desc: "Переименовали таблицу и добавили колонку".into(),
                fields: vec![field("id"), field("user_id"), field("total")],
            })
            .await
            .unwrap();

        assert_eq!(relation_count(&pool).await, 1);
    }

    #[tokio::test]
    async fn deleting_a_table_deletes_its_relations() {
        let pool = db().await;
        let (users, _) = linked(&pool).await;

        EntityRepo::new(&pool).delete(&users).await.unwrap();

        assert_eq!(relation_count(&pool).await, 0);
    }
}
