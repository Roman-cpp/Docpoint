//! Приведение снимка схемы к тому, что умеет нарисовать холст.
//!
//! Файл импорта на тех же нарушениях падает с ошибкой (`parseErdImport`) — там
//! их написал человек и должен исправить. Здесь наоборот: боевая схема дана
//! как есть, и отказать в импорте из-за самоссылающегося `parent_id` нельзя.
//! Поэтому лишнее выбрасывается, но каждое решение объясняется строкой в
//! `notices` — предпросмотр показывает их списком.
//!
//! Проверки обязаны отработать до записи ещё и потому, что `import_erd` не
//! проверяет ничего, а на связях стоит UNIQUE: дубль уронил бы импорт на
//! середине, оставив узел с половиной таблиц.

use std::collections::{HashMap, HashSet};

use crate::domain::db_import::schema::dto::{
    DbIntrospectDTO, DbNoticeDTO, DbRelationDTO, DbTableDTO,
};
use crate::domain::db_import::schema::entity::DbSchema;

use super::render::to_field;

/// С этого числа таблиц диаграмма перестаёт читаться целиком, и выбор нужных
/// становится не удобством, а необходимостью.
const CROWDED: usize = 60;

pub fn to_erd(schema: &DbSchema) -> DbIntrospectDTO {
    let mut notices: Vec<DbNoticeDTO> = Vec::new();
    let known: HashSet<&str> = schema.tables.iter().map(|t| t.name.as_str()).collect();

    let mut relations: Vec<DbRelationDTO> = Vec::new();
    // Ненаправленный ключ пары колонок: та же пара в обратную сторону — не
    // вторая связь, а спор о том, где сторона первичного ключа.
    let mut seen: HashSet<String> = HashSet::new();
    // Колонка → на что она ссылается: подпись попадёт в заметку поля.
    let mut fk_target: HashMap<(&str, &str), String> = HashMap::new();

    for table in &schema.tables {
        for fk in &table.foreign_keys {
            if fk.columns.is_empty() || fk.columns.len() != fk.ref_columns.len() {
                notices.push(DbNoticeDTO {
                    kind: "composite".into(),
                    message: format!("«{}»: внешний ключ без пары колонок пропущен", table.name),
                });
                continue;
            }

            if !known.contains(fk.ref_table.as_str()) {
                notices.push(DbNoticeDTO {
                    kind: "externalRef".into(),
                    message: format!(
                        "«{}.{}» ссылается на таблицу «{}» вне этой схемы — связь пропущена",
                        table.name, fk.columns[0], fk.ref_table
                    ),
                });
                continue;
            }

            if fk.columns.len() > 1 {
                notices.push(DbNoticeDTO {
                    kind: "composite".into(),
                    message: format!(
                        "«{}» → «{}»: составной ключ из {} колонок — показана связь по «{}»",
                        table.name,
                        fk.ref_table,
                        fk.columns.len(),
                        fk.columns[0]
                    ),
                });
            }

            let (from_table, from_column) = (fk.ref_table.clone(), fk.ref_columns[0].clone());
            let (to_table, to_column) = (table.name.clone(), fk.columns[0].clone());

            let mut ends = [
                format!("{from_table}.{from_column}"),
                format!("{to_table}.{to_column}"),
            ];
            ends.sort();
            let key = ends.join(" ↔ ");
            if !seen.insert(key.clone()) {
                notices.push(DbNoticeDTO {
                    kind: "duplicate".into(),
                    message: format!("связь {key} описана дважды — оставлена одна"),
                });
                continue;
            }

            fk_target.insert(
                (table.name.as_str(), fk.columns[0].as_str()),
                format!("{from_table}.{from_column}"),
            );

            relations.push(DbRelationDTO {
                from_table,
                from_column,
                to_table,
                to_column,
            });
        }
    }

    let tables: Vec<DbTableDTO> = schema
        .tables
        .iter()
        .map(|table| DbTableDTO {
            name: table.name.clone(),
            desc: table.comment.clone(),
            fields: table
                .columns
                .iter()
                .map(|column| {
                    let target = fk_target
                        .get(&(table.name.as_str(), column.name.as_str()))
                        .map(String::as_str);
                    to_field(column, target)
                })
                .collect(),
        })
        .collect();

    if tables.is_empty() {
        notices.push(DbNoticeDTO {
            kind: "empty".into(),
            message: format!("В схеме «{}» нет таблиц", schema.name),
        });
    } else if tables.len() > CROWDED {
        notices.push(DbNoticeDTO {
            kind: "large".into(),
            message: format!(
                "Найдено таблиц: {} — на холсте столько не читается, отметьте нужные",
                tables.len()
            ),
        });
    }

    DbIntrospectDTO {
        schema: schema.name.clone(),
        tables,
        relations,
        notices,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::db_import::schema::entity::{DbColumn, DbForeignKey, DbTable};

    fn column(name: &str) -> DbColumn {
        DbColumn {
            name: name.into(),
            type_name: "int".into(),
            nullable: false,
            pk: false,
            default: None,
            comment: String::new(),
            enum_values: vec![],
            extra: String::new(),
        }
    }

    fn table(name: &str, columns: &[&str], fks: Vec<DbForeignKey>) -> DbTable {
        DbTable {
            name: name.into(),
            comment: String::new(),
            columns: columns.iter().map(|c| column(c)).collect(),
            foreign_keys: fks,
        }
    }

    fn fk(columns: &[&str], ref_table: &str, ref_columns: &[&str]) -> DbForeignKey {
        DbForeignKey {
            columns: columns.iter().map(|c| c.to_string()).collect(),
            ref_table: ref_table.into(),
            ref_columns: ref_columns.iter().map(|c| c.to_string()).collect(),
        }
    }

    fn schema(tables: Vec<DbTable>) -> DbSchema {
        DbSchema {
            name: "public".into(),
            tables,
        }
    }

    #[test]
    fn a_foreign_key_points_from_the_primary_key_side() {
        let erd = to_erd(&schema(vec![
            table("users", &["id"], vec![]),
            table(
                "orders",
                &["id", "user_id"],
                vec![fk(&["user_id"], "users", &["id"])],
            ),
        ]));

        assert_eq!(erd.relations.len(), 1);
        let rel = &erd.relations[0];
        assert_eq!(
            (rel.from_table.as_str(), rel.from_column.as_str()),
            ("users", "id")
        );
        assert_eq!(
            (rel.to_table.as_str(), rel.to_column.as_str()),
            ("orders", "user_id")
        );
        assert!(erd.notices.is_empty());
    }

    #[test]
    fn a_self_reference_becomes_a_relation_like_any_other() {
        // parent_id → id встречается едва ли не в каждой схеме. Холст рисует
        // такую связь петлёй, так что прятать её из импорта незачем.
        let erd = to_erd(&schema(vec![table(
            "employees",
            &["id", "manager_id"],
            vec![fk(&["manager_id"], "employees", &["id"])],
        )]));

        assert_eq!(erd.relations.len(), 1);
        let rel = &erd.relations[0];
        assert_eq!(
            (
                rel.from_table.as_str(),
                rel.from_column.as_str(),
                rel.to_table.as_str(),
                rel.to_column.as_str()
            ),
            ("employees", "id", "employees", "manager_id")
        );
        assert!(erd.notices.is_empty(), "предупреждать не о чем");
    }

    #[test]
    fn a_composite_key_becomes_one_relation_on_its_first_pair() {
        let erd = to_erd(&schema(vec![
            table("orders", &["id", "seq"], vec![]),
            table(
                "items",
                &["order_id", "order_seq"],
                vec![fk(&["order_id", "order_seq"], "orders", &["id", "seq"])],
            ),
        ]));

        assert_eq!(erd.relations.len(), 1);
        assert_eq!(erd.relations[0].to_column, "order_id");
        assert_eq!(erd.notices[0].kind, "composite");
    }

    #[test]
    fn the_same_pair_declared_twice_stays_one_relation() {
        // На четвёрку концов в entity_relation стоит UNIQUE: дубль уронил бы
        // импорт уже после записи узла и части таблиц.
        let erd = to_erd(&schema(vec![
            table("users", &["id"], vec![]),
            table(
                "orders",
                &["user_id"],
                vec![
                    fk(&["user_id"], "users", &["id"]),
                    fk(&["user_id"], "users", &["id"]),
                ],
            ),
        ]));

        assert_eq!(erd.relations.len(), 1);
        assert_eq!(erd.notices[0].kind, "duplicate");
    }

    #[test]
    fn a_reference_outside_the_schema_cannot_be_drawn() {
        let erd = to_erd(&schema(vec![table(
            "orders",
            &["client_id"],
            vec![fk(&["client_id"], "clients", &["id"])],
        )]));

        assert!(erd.relations.is_empty());
        assert_eq!(erd.notices[0].kind, "externalRef");
    }

    #[test]
    fn a_foreign_key_column_says_where_it_points() {
        let erd = to_erd(&schema(vec![
            table("users", &["id"], vec![]),
            table(
                "orders",
                &["user_id"],
                vec![fk(&["user_id"], "users", &["id"])],
            ),
        ]));

        let orders = erd.tables.iter().find(|t| t.name == "orders").unwrap();
        assert_eq!(orders.fields[0].note, "FK → users.id");
    }

    #[test]
    fn an_empty_schema_is_reported_but_not_an_error() {
        let erd = to_erd(&schema(vec![]));
        assert!(erd.tables.is_empty());
        assert_eq!(erd.notices[0].kind, "empty");
    }
}
