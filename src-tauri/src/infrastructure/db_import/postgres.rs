//! Чтение схемы PostgreSQL.
//!
//! Запросы идут по `pg_catalog`, а не по `information_schema`: колонки второго
//! объявлены доменами (`sql_identifier`, `character_data`), и sqlx не умеет
//! читать их как строки. По той же причине всё текстовое приводится `::text`.
//!
//! Составные ключи разворачиваются `unnest(...) WITH ORDINALITY` — иначе
//! пришлось бы декодировать `int2vector`, чего sqlx тоже не умеет.

use std::collections::HashMap;

use sqlx::{PgConnection, Row};

use crate::domain::db_import::schema::entity::{DbColumn, DbForeignKey, DbSchema, DbTable};
use crate::domain::db_import::schema::repository::SchemaSource;

use super::render::pg_short_type;

pub struct PgSource<'a> {
    pub conn: &'a mut PgConnection,
}

impl SchemaSource for PgSource<'_> {
    async fn schemas(&mut self) -> Result<Vec<String>, String> {
        let rows = sqlx::query(
            r#"SELECT n.nspname::text AS name
               FROM pg_catalog.pg_namespace n
               WHERE n.nspname NOT LIKE 'pg\_%' AND n.nspname <> 'information_schema'
               ORDER BY 1"#,
        )
        .fetch_all(&mut *self.conn)
        .await
        .map_err(|e| e.to_string())?;

        Ok(rows.iter().map(|r| r.get::<String, _>("name")).collect())
    }

    async fn introspect(&mut self, schema: &str) -> Result<DbSchema, String> {
        let table_rows = sqlx::query(
            r#"SELECT c.relname::text AS name,
                      COALESCE(pg_catalog.obj_description(c.oid, 'pg_class'), '')::text AS comment
               FROM pg_catalog.pg_class c
               JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
               WHERE n.nspname = $1 AND c.relkind IN ('r', 'p')
               ORDER BY c.relname"#,
        )
        .bind(schema)
        .fetch_all(&mut *self.conn)
        .await
        .map_err(|e| e.to_string())?;

        // Метки перечислений по имени типа: колонка ссылается на тип, который
        // может быть объявлен и в другой схеме.
        let enum_rows = sqlx::query(
            r#"SELECT n.nspname::text AS type_schema,
                      t.typname::text AS type_name,
                      e.enumlabel::text AS label
               FROM pg_catalog.pg_type t
               JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
               JOIN pg_catalog.pg_enum e      ON e.enumtypid = t.oid
               WHERE t.typtype = 'e'
               ORDER BY t.typname, e.enumsortorder"#,
        )
        .fetch_all(&mut *self.conn)
        .await
        .map_err(|e| e.to_string())?;

        let mut enums: HashMap<(String, String), Vec<String>> = HashMap::new();
        for row in &enum_rows {
            enums
                .entry((row.get("type_schema"), row.get("type_name")))
                .or_default()
                .push(row.get("label"));
        }

        let column_rows = sqlx::query(
            r#"SELECT c.relname::text                                       AS table_name,
                      a.attname::text                                       AS column_name,
                      pg_catalog.format_type(a.atttypid, a.atttypmod)::text AS data_type,
                      (NOT a.attnotnull)                                    AS nullable,
                      pg_catalog.pg_get_expr(d.adbin, d.adrelid)::text      AS default_expr,
                      COALESCE(pg_catalog.col_description(c.oid, a.attnum), '')::text AS comment,
                      t.typname::text                                       AS type_name,
                      tn.nspname::text                                      AS type_schema
               FROM pg_catalog.pg_attribute a
               JOIN pg_catalog.pg_class     c  ON c.oid = a.attrelid
               JOIN pg_catalog.pg_namespace n  ON n.oid = c.relnamespace
               JOIN pg_catalog.pg_type      t  ON t.oid = a.atttypid
               JOIN pg_catalog.pg_namespace tn ON tn.oid = t.typnamespace
               LEFT JOIN pg_catalog.pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
               WHERE n.nspname = $1 AND c.relkind IN ('r', 'p')
                 AND a.attnum > 0 AND NOT a.attisdropped
               ORDER BY c.relname, a.attnum"#,
        )
        .bind(schema)
        .fetch_all(&mut *self.conn)
        .await
        .map_err(|e| e.to_string())?;

        let pk_rows = sqlx::query(
            r#"SELECT c.relname::text AS table_name, a.attname::text AS column_name
               FROM pg_catalog.pg_constraint con
               JOIN pg_catalog.pg_class     c ON c.oid = con.conrelid
               JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
               CROSS JOIN LATERAL unnest(con.conkey) WITH ORDINALITY AS k(attnum, ord)
               JOIN pg_catalog.pg_attribute a ON a.attrelid = con.conrelid AND a.attnum = k.attnum
               WHERE con.contype = 'p' AND n.nspname = $1
               ORDER BY c.relname, k.ord"#,
        )
        .bind(schema)
        .fetch_all(&mut *self.conn)
        .await
        .map_err(|e| e.to_string())?;

        let mut pks: HashMap<(String, String), ()> = HashMap::new();
        for row in &pk_rows {
            pks.insert((row.get("table_name"), row.get("column_name")), ());
        }

        let fk_rows = sqlx::query(
            r#"SELECT con.conname::text AS fk_name,
                      c.relname::text   AS table_name,
                      a.attname::text   AS column_name,
                      fc.relname::text  AS ref_table,
                      fa.attname::text  AS ref_column
               FROM pg_catalog.pg_constraint con
               JOIN pg_catalog.pg_class     c  ON c.oid  = con.conrelid
               JOIN pg_catalog.pg_namespace n  ON n.oid  = c.relnamespace
               JOIN pg_catalog.pg_class     fc ON fc.oid = con.confrelid
               JOIN pg_catalog.pg_namespace fn ON fn.oid = fc.relnamespace
               CROSS JOIN LATERAL unnest(con.conkey, con.confkey) WITH ORDINALITY AS k(attnum, fattnum, ord)
               JOIN pg_catalog.pg_attribute a  ON a.attrelid  = con.conrelid  AND a.attnum  = k.attnum
               JOIN pg_catalog.pg_attribute fa ON fa.attrelid = con.confrelid AND fa.attnum = k.fattnum
               WHERE con.contype = 'f' AND n.nspname = $1 AND fn.nspname = $1
               ORDER BY c.relname, con.conname, k.ord"#,
        )
        .bind(schema)
        .fetch_all(&mut *self.conn)
        .await
        .map_err(|e| e.to_string())?;

        // Ключ группировки — (таблица, имя ограничения): у составного ключа
        // строки идут подряд в порядке позиции колонки.
        let mut fks: HashMap<String, Vec<(String, DbForeignKey)>> = HashMap::new();
        for row in &fk_rows {
            let table: String = row.get("table_name");
            let name: String = row.get("fk_name");
            let column: String = row.get("column_name");
            let ref_table: String = row.get("ref_table");
            let ref_column: String = row.get("ref_column");

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
            let table: String = row.get("table_name");
            let name: String = row.get("column_name");
            let type_schema: String = row.get("type_schema");
            let type_name: String = row.get("type_name");

            columns_by_table
                .entry(table.clone())
                .or_default()
                .push(DbColumn {
                    pk: pks.contains_key(&(table, name.clone())),
                    name,
                    type_name: pg_short_type(&row.get::<String, _>("data_type")),
                    nullable: row.get("nullable"),
                    default: row.get::<Option<String>, _>("default_expr"),
                    comment: row.get("comment"),
                    enum_values: enums
                        .get(&(type_schema, type_name))
                        .cloned()
                        .unwrap_or_default(),
                    extra: String::new(),
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
