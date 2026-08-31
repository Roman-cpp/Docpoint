//! Чтение схемы из файла SQLite.
//!
//! Схем у SQLite нет — есть одна `main`, поэтому мастер на этом виде базы
//! пропускает шаг выбора. Колонки и ключи отдают табличные pragma-функции:
//! они принимают имя таблицы биндом, и подставлять его в текст запроса (а
//! значит и экранировать кавычки в имени) не приходится.

use sqlx::{Row, SqliteConnection};

use crate::domain::db_import::schema::entity::{DbColumn, DbForeignKey, DbSchema, DbTable};
use crate::domain::db_import::schema::repository::SchemaSource;

pub struct LiteSource<'a> {
    pub conn: &'a mut SqliteConnection,
}

impl SchemaSource for LiteSource<'_> {
    async fn schemas(&mut self) -> Result<Vec<String>, String> {
        Ok(vec!["main".to_string()])
    }

    async fn introspect(&mut self, schema: &str) -> Result<DbSchema, String> {
        let rows = sqlx::query(
            r#"SELECT name FROM sqlite_master
               WHERE type = 'table' AND name NOT LIKE 'sqlite\_%' ESCAPE '\'
               ORDER BY name"#,
        )
        .fetch_all(&mut *self.conn)
        .await
        .map_err(|e| e.to_string())?;

        let names: Vec<String> = rows.iter().map(|r| r.get::<String, _>("name")).collect();
        let mut tables = Vec::with_capacity(names.len());

        for name in names {
            let column_rows = sqlx::query(
                r#"SELECT name, type, "notnull", dflt_value, pk FROM pragma_table_info(?)"#,
            )
            .bind(&name)
            .fetch_all(&mut *self.conn)
            .await
            .map_err(|e| e.to_string())?;

            let columns: Vec<DbColumn> = column_rows
                .iter()
                .map(|r| {
                    let declared: String = r.get("type");
                    DbColumn {
                        name: r.get("name"),
                        // Пустой тип у SQLite законен: у такой колонки нет
                        // сродства, и «any» честнее подставленной строки.
                        type_name: if declared.trim().is_empty() {
                            "any".to_string()
                        } else {
                            declared
                        },
                        nullable: r.get::<i64, _>("notnull") == 0,
                        // `pk` — не флаг, а позиция в составном ключе.
                        pk: r.get::<i64, _>("pk") > 0,
                        default: r.get::<Option<String>, _>("dflt_value"),
                        comment: String::new(),
                        enum_values: vec![],
                        extra: String::new(),
                    }
                })
                .collect();

            let fk_rows = sqlx::query(
                r#"SELECT id, seq, "table", "from", "to" FROM pragma_foreign_key_list(?)"#,
            )
            .bind(&name)
            .fetch_all(&mut *self.conn)
            .await
            .map_err(|e| e.to_string())?;

            let mut foreign_keys: Vec<DbForeignKey> = Vec::new();
            let mut current_id: Option<i64> = None;

            for row in &fk_rows {
                let id: i64 = row.get("id");
                let ref_table: String = row.get("table");
                // `from`/`to` бывают NULL, когда ключ объявлен без списка
                // колонок: связать такую пару не с чем.
                let (from, to) = match (
                    row.get::<Option<String>, _>("from"),
                    row.get::<Option<String>, _>("to"),
                ) {
                    (Some(from), Some(to)) => (from, to),
                    _ => continue,
                };

                if current_id == Some(id) {
                    if let Some(last) = foreign_keys.last_mut() {
                        last.columns.push(from);
                        last.ref_columns.push(to);
                        continue;
                    }
                }

                current_id = Some(id);
                foreign_keys.push(DbForeignKey {
                    columns: vec![from],
                    ref_table,
                    ref_columns: vec![to],
                });
            }

            tables.push(DbTable {
                name,
                comment: String::new(),
                columns,
                foreign_keys,
            });
        }

        Ok(DbSchema {
            name: schema.to_string(),
            tables,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::infrastructure::db_import::normalize;
    use sqlx::Connection;

    /// База-незнакомка: это чужая схема, а не наша, поэтому она собирается
    /// голым DDL, а не миграциями проекта (`test_db`).
    async fn foreign_db() -> SqliteConnection {
        let mut conn = SqliteConnection::connect("sqlite::memory:").await.unwrap();
        sqlx::raw_sql(
            r#"
            CREATE TABLE users (
                id    INTEGER PRIMARY KEY,
                email TEXT NOT NULL,
                bio   TEXT
            );
            CREATE TABLE orders (
                id      INTEGER PRIMARY KEY,
                user_id INTEGER REFERENCES users(id),
                total   NUMERIC(12,2) DEFAULT 0
            );
            CREATE TABLE employees (
                id         INTEGER PRIMARY KEY,
                manager_id INTEGER REFERENCES employees(id)
            );
            CREATE TABLE tags (a INT, b INT, PRIMARY KEY (a, b));
            "#,
        )
        .execute(&mut conn)
        .await
        .unwrap();
        conn
    }

    #[tokio::test]
    async fn a_sqlite_file_yields_its_tables_columns_and_keys() {
        let mut conn = foreign_db().await;
        let schema = LiteSource { conn: &mut conn }
            .introspect("main")
            .await
            .unwrap();

        let names: Vec<&str> = schema.tables.iter().map(|t| t.name.as_str()).collect();
        assert_eq!(names, vec!["employees", "orders", "tags", "users"]);

        let users = schema.tables.iter().find(|t| t.name == "users").unwrap();
        assert!(users.columns[0].pk);
        assert!(!users.columns[1].nullable, "email объявлен NOT NULL");
        assert!(users.columns[2].nullable, "bio без NOT NULL");

        let orders = schema.tables.iter().find(|t| t.name == "orders").unwrap();
        assert_eq!(orders.columns[2].type_name, "NUMERIC(12,2)");
        assert_eq!(orders.columns[2].default.as_deref(), Some("0"));
        assert_eq!(orders.foreign_keys[0].ref_table, "users");

        // Составной первичный ключ: pk у SQLite — позиция, а не флаг.
        let tags = schema.tables.iter().find(|t| t.name == "tags").unwrap();
        assert!(tags.columns.iter().all(|c| c.pk));
    }

    #[tokio::test]
    async fn the_erd_payload_keeps_only_what_the_canvas_can_draw() {
        let mut conn = foreign_db().await;
        let schema = LiteSource { conn: &mut conn }
            .introspect("main")
            .await
            .unwrap();
        let erd = normalize::to_erd(&schema);

        assert_eq!(erd.relations.len(), 1, "самоссылка employees не в счёт");
        assert_eq!(erd.relations[0].from_table, "users");
        assert_eq!(erd.relations[0].to_table, "orders");
        assert!(erd.notices.iter().any(|n| n.kind == "selfRef"));
    }
}
