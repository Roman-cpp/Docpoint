//! Чтение схемы MySQL.
//!
//! База и схема у MySQL — одно и то же, поэтому «список схем» здесь список баз.
//! Позиции колонок приходится приводить `CAST(... AS SIGNED)`: в MySQL 8 они
//! объявлены `int unsigned`, и sqlx отказывается читать их как целое со знаком.

use std::collections::HashMap;

use sqlx::{MySqlConnection, Row};

use crate::domain::db_import::schema::entity::{DbColumn, DbForeignKey, DbSchema, DbTable};
use crate::domain::db_import::schema::repository::SchemaSource;

use super::render::parse_mysql_enum;

pub struct MySource<'a> {
    pub conn: &'a mut MySqlConnection,
}

impl SchemaSource for MySource<'_> {
    async fn schemas(&mut self) -> Result<Vec<String>, String> {
        let rows = sqlx::query(
            r#"SELECT SCHEMA_NAME AS name FROM information_schema.SCHEMATA
               WHERE SCHEMA_NAME NOT IN ('mysql', 'information_schema', 'performance_schema', 'sys')
               ORDER BY SCHEMA_NAME"#,
        )
        .fetch_all(&mut *self.conn)
        .await
        .map_err(|e| e.to_string())?;

        Ok(rows.iter().map(|r| r.get::<String, _>("name")).collect())
    }

    async fn introspect(&mut self, schema: &str) -> Result<DbSchema, String> {
        let table_rows = sqlx::query(
            r#"SELECT TABLE_NAME AS name, IFNULL(TABLE_COMMENT, '') AS comment
               FROM information_schema.TABLES
               WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE'
               ORDER BY TABLE_NAME"#,
        )
        .bind(schema)
        .fetch_all(&mut *self.conn)
        .await
        .map_err(|e| e.to_string())?;

        let column_rows = sqlx::query(
            r#"SELECT TABLE_NAME, COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_KEY,
                      COLUMN_DEFAULT, EXTRA, IFNULL(COLUMN_COMMENT, '') AS COLUMN_COMMENT
               FROM information_schema.COLUMNS
               WHERE TABLE_SCHEMA = ?
               ORDER BY TABLE_NAME, CAST(ORDINAL_POSITION AS SIGNED)"#,
        )
        .bind(schema)
        .fetch_all(&mut *self.conn)
        .await
        .map_err(|e| e.to_string())?;

        let fk_rows = sqlx::query(
            r#"SELECT CONSTRAINT_NAME, TABLE_NAME, COLUMN_NAME,
                      REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
               FROM information_schema.KEY_COLUMN_USAGE
               WHERE TABLE_SCHEMA = ?
                 AND REFERENCED_TABLE_NAME IS NOT NULL
                 AND REFERENCED_TABLE_SCHEMA = TABLE_SCHEMA
               ORDER BY TABLE_NAME, CONSTRAINT_NAME, CAST(ORDINAL_POSITION AS SIGNED)"#,
        )
        .bind(schema)
        .fetch_all(&mut *self.conn)
        .await
        .map_err(|e| e.to_string())?;

        let mut fks: HashMap<String, Vec<(String, DbForeignKey)>> = HashMap::new();
        for row in &fk_rows {
            let table: String = row.get("TABLE_NAME");
            let name: String = row.get("CONSTRAINT_NAME");
            let column: String = row.get("COLUMN_NAME");
            let ref_table: String = row.get("REFERENCED_TABLE_NAME");
            let ref_column: String = row.get("REFERENCED_COLUMN_NAME");

            let entry = fks.entry(table).or_default();
            match entry.iter_mut().find(|(n, _)| *n == name) {
                Some((_, fk)) => {
                    fk.columns.push(column);
                    fk.ref_columns.push(ref_column);
                }
                None => entry.push((
                    name,
                    DbForeignKey {
                        columns: vec![column],
                        ref_table,
                        ref_columns: vec![ref_column],
                    },
                )),
            }
        }

        let mut columns_by_table: HashMap<String, Vec<DbColumn>> = HashMap::new();
        for row in &column_rows {
            let table: String = row.get("TABLE_NAME");
            let column_type: String = row.get("COLUMN_TYPE");
            let enum_values = parse_mysql_enum(&column_type);

            columns_by_table.entry(table).or_default().push(DbColumn {
                name: row.get("COLUMN_NAME"),
                // Список из тридцати значений в ячейке типа нечитаем, поэтому у
                // перечисления в типе остаётся только его вид.
                type_name: if enum_values.is_empty() {
                    column_type
                } else if column_type.to_ascii_lowercase().starts_with("set") {
                    "set".to_string()
                } else {
                    "enum".to_string()
                },
                nullable: row
                    .get::<String, _>("IS_NULLABLE")
                    .eq_ignore_ascii_case("YES"),
                pk: row.get::<String, _>("COLUMN_KEY") == "PRI",
                default: row.get::<Option<String>, _>("COLUMN_DEFAULT"),
                comment: row.get("COLUMN_COMMENT"),
                enum_values,
                extra: row.get::<String, _>("EXTRA"),
            });
        }

        let tables = table_rows
            .iter()
            .map(|row| {
                let name: String = row.get("name");
                DbTable {
                    columns: columns_by_table.remove(&name).unwrap_or_default(),
                    foreign_keys: fks
                        .remove(&name)
                        .map(|list| list.into_iter().map(|(_, fk)| fk).collect())
                        .unwrap_or_default(),
                    comment: row.get("comment"),
                    name,
                }
            })
            .collect();

        Ok(DbSchema {
            name: schema.to_string(),
            tables,
        })
    }
}
