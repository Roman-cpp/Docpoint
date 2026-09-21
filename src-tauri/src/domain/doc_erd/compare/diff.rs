//! Сведение диаграммы и схемы живой базы в одну картину.
//!
//! Чисто: на вход — то, что лежит в документе, и то, что вернула интроспекция,
//! на выход — объединение с пометкой, откуда что известно. Ни базы, ни канваса
//! здесь нет, поэтому правила сопоставления проверяются тестами целиком.
//!
//! Таблица и колонка опознаются по имени, свёрнутому в нижний регистр: PostgreSQL
//! приводит незакавыченные идентификаторы к нижнему регистру, а в документе имя
//! пишет человек — при точном сравнении одна и та же таблица разошлась бы на две.

use std::collections::{HashMap, HashSet};

use crate::domain::db_import::schema::dto::{
    DbIntrospectDTO, DbNoticeDTO, DbRelationDTO, DbTableDTO,
};
use crate::domain::doc_erd::entity::entity::{Entity, EntityField};
use crate::domain::doc_erd::entity_relation::entity::EntityRelation;
use crate::domain::doc_erd::import::layout::{self, Edge, FixedTable, FreeTable};

use super::entity::{
    ColumnDiff, DiffStatus, DiffSummary, ErdDiff, Mismatch, RelationDiff, TableDiff,
};

/// Ключ сопоставления имён.
fn key(name: &str) -> String {
    name.trim().to_lowercase()
}

/// Ненаправленный ключ связи: та же пара колонок в обратную сторону — не вторая
/// связь, а спор о том, где сторона первичного ключа. Документ мог нарисовать
/// её как угодно, база всегда называет первичной сторону, на которую ссылаются.
fn ends(from_table: &str, from_column: &str, to_table: &str, to_column: &str) -> (String, String) {
    let a = format!("{}.{}", key(from_table), key(from_column));
    let b = format!("{}.{}", key(to_table), key(to_column));
    if a <= b {
        (a, b)
    } else {
        (b, a)
    }
}

pub fn compare(doc: &[Entity], doc_relations: &[EntityRelation], db: DbIntrospectDTO) -> ErdDiff {
    let mut summary = DiffSummary::default();
    let mut notices = db.notices;

    let mut db_by_key: HashMap<String, &DbTableDTO> = HashMap::new();
    for table in &db.tables {
        db_by_key.insert(key(&table.name), table);
    }

    // Две таблицы документа, различающиеся только регистром, сошлись бы на одной
    // таблице базы — сравнение показало бы обе совпавшими. Молчать об этом
    // нельзя, но и отказываться сравнивать не за что.
    let mut seen_doc: HashMap<String, &str> = HashMap::new();
    for entity in doc {
        if let Some(first) = seen_doc.insert(key(&entity.name), entity.name.as_str()) {
            notices.push(DbNoticeDTO {
                kind: "duplicate".into(),
                message: format!(
                    "«{}» и «{}» на диаграмме различаются только регистром — сравнение ведётся по первой",
                    first, entity.name
                ),
            });
        }
    }

    let mut matched: HashSet<String> = HashSet::new();
    let mut tables: Vec<TableDiff> = Vec::with_capacity(doc.len() + db.tables.len());

    for entity in doc {
        let k = key(&entity.name);
        match db_by_key.get(&k) {
            Some(db_table) if matched.insert(k) => {
                let columns = merge_columns(&entity.fields, &db_table.fields, &mut summary);
                let status = if columns.iter().all(|c| c.status == DiffStatus::Same) {
                    DiffStatus::Same
                } else {
                    summary.tables_differ += 1;
                    DiffStatus::Differs
                };
                tables.push(TableDiff {
                    id: Some(entity.id.clone()),
                    name: entity.name.clone(),
                    status,
                    x: None,
                    y: None,
                    columns,
                    fields: Vec::new(),
                });
            }
            // Таблицы в базе нет — либо она уже сопоставлена одноимённой
            // (см. заметку выше), и второй раз сравнивать её не с чем.
            _ => {
                summary.tables_only_in_doc += 1;
                tables.push(TableDiff {
                    id: Some(entity.id.clone()),
                    name: entity.name.clone(),
                    status: DiffStatus::OnlyInDoc,
                    x: None,
                    y: None,
                    columns: entity
                        .fields
                        .iter()
                        .map(|f| ColumnDiff {
                            name: f.name.clone(),
                            status: DiffStatus::OnlyInDoc,
                            doc_type: Some(f.type_.clone()),
                            db_type: None,
                            mismatch: Vec::new(),
                            pk: f.pk,
                            nullable: f.nullable,
                        })
                        .collect(),
                    fields: Vec::new(),
                });
            }
        }
    }

    // Таблицы, которых на диаграмме нет. Место им ищет та же раскладка, что и
    // импорту: уже расставленные таблицы она не двигает, а новые ставит рядом
    // с их роднёй по связям.
    let ghosts: Vec<&DbTableDTO> = db
        .tables
        .iter()
        .filter(|t| !matched.contains(&key(&t.name)))
        .collect();

    let places = place_ghosts(doc, &ghosts, &db.relations);

    for (ghost, (x, y)) in ghosts.iter().zip(places) {
        summary.tables_only_in_db += 1;
        tables.push(TableDiff {
            id: None,
            name: ghost.name.clone(),
            status: DiffStatus::OnlyInDb,
            x: Some(x),
            y: Some(y),
            columns: ghost
                .fields
                .iter()
                .map(|f| ColumnDiff {
                    name: f.name.clone(),
                    status: DiffStatus::OnlyInDb,
                    doc_type: None,
                    db_type: Some(f.type_.clone()),
                    mismatch: Vec::new(),
                    pk: f.pk,
                    nullable: f.nullable,
                })
                .collect(),
            fields: ghost.fields.clone(),
        });
    }

    let relations = merge_relations(doc, doc_relations, &db.relations, &mut summary);

    ErdDiff {
        schema: db.schema,
        tables,
        relations,
        notices,
        summary,
    }
}

/// Колонки объединением: сначала описанные в документе, в его порядке, затем
/// те, что есть только в базе. Порядок колонок различием не считается — в
/// документе он смысловой, в базе физический.
fn merge_columns(
    doc: &[EntityField],
    db: &[EntityField],
    summary: &mut DiffSummary,
) -> Vec<ColumnDiff> {
    let db_by_key: HashMap<String, &EntityField> = db.iter().map(|f| (key(&f.name), f)).collect();
    let mut matched: HashSet<String> = HashSet::new();
    let mut columns = Vec::with_capacity(doc.len() + db.len());

    for field in doc {
        let k = key(&field.name);
        match db_by_key.get(&k) {
            Some(theirs) => {
                matched.insert(k);
                let mut mismatch = Vec::new();
                if field.nullable != theirs.nullable {
                    mismatch.push(Mismatch::Nullable);
                }
                if field.pk != theirs.pk {
                    mismatch.push(Mismatch::Pk);
                }
                let status = if mismatch.is_empty() {
                    DiffStatus::Same
                } else {
                    summary.columns_differ += 1;
                    DiffStatus::Differs
                };
                columns.push(ColumnDiff {
                    name: field.name.clone(),
                    status,
                    doc_type: Some(field.type_.clone()),
                    db_type: Some(theirs.type_.clone()),
                    mismatch,
                    // Флаги берём из базы: она — источник правды о том, что
                    // сейчас действительно так.
                    pk: theirs.pk,
                    nullable: theirs.nullable,
                });
            }
            None => {
                summary.columns_only_in_doc += 1;
                columns.push(ColumnDiff {
                    name: field.name.clone(),
                    status: DiffStatus::OnlyInDoc,
                    doc_type: Some(field.type_.clone()),
                    db_type: None,
                    mismatch: Vec::new(),
                    pk: field.pk,
                    nullable: field.nullable,
                });
            }
        }
    }

    for field in db {
        if matched.contains(&key(&field.name)) {
            continue;
        }
        summary.columns_only_in_db += 1;
        columns.push(ColumnDiff {
            name: field.name.clone(),
            status: DiffStatus::OnlyInDb,
            doc_type: None,
            db_type: Some(field.type_.clone()),
            mismatch: Vec::new(),
            pk: field.pk,
            nullable: field.nullable,
        });
    }

    columns
}

/// Связи объединением. Сначала нарисованные на диаграмме — совпавшая с базой
/// помечается `Same`, остальные `OnlyInDoc`; затем те, что нашлись в базе и не
/// нарисованы. Направление у последних берётся из базы: сторона первичного
/// ключа там известна точно, а холсту она нужна для «гусиной лапки».
fn merge_relations(
    doc: &[Entity],
    doc_relations: &[EntityRelation],
    db_relations: &[DbRelationDTO],
    summary: &mut DiffSummary,
) -> Vec<RelationDiff> {
    let name_of: HashMap<&str, &str> = doc
        .iter()
        .map(|e| (e.id.as_str(), e.name.as_str()))
        .collect();

    let mut in_db: HashMap<(String, String), &DbRelationDTO> = db_relations
        .iter()
        .map(|r| {
            (
                ends(&r.from_table, &r.from_column, &r.to_table, &r.to_column),
                r,
            )
        })
        .collect();

    let mut relations = Vec::new();

    for relation in doc_relations {
        let (Some(from), Some(to)) = (
            name_of.get(relation.from_entity.as_str()),
            name_of.get(relation.to_entity.as_str()),
        ) else {
            continue;
        };

        let k = ends(from, &relation.from_field, to, &relation.to_field);
        let status = if in_db.remove(&k).is_some() {
            DiffStatus::Same
        } else {
            summary.relations_only_in_doc += 1;
            DiffStatus::OnlyInDoc
        };

        relations.push(RelationDiff {
            status,
            from_table: (*from).to_string(),
            from_column: relation.from_field.clone(),
            to_table: (*to).to_string(),
            to_column: relation.to_field.clone(),
        });
    }

    // Порядок остатка — тот же, что в схеме: `HashMap` его не хранит, а
    // диаграмма не должна перетасовываться от запуска к запуску.
    for relation in db_relations {
        let k = ends(
            &relation.from_table,
            &relation.from_column,
            &relation.to_table,
            &relation.to_column,
        );
        if !in_db.contains_key(&k) {
            continue;
        }
        in_db.remove(&k);
        summary.relations_only_in_db += 1;
        relations.push(RelationDiff {
            status: DiffStatus::OnlyInDb,
            from_table: relation.from_table.clone(),
            from_column: relation.from_column.clone(),
            to_table: relation.to_table.clone(),
            to_column: relation.to_column.clone(),
        });
    }

    relations
}

/// Места для таблиц, которых на диаграмме нет. Имена свёрнуты: раскладка
/// сопоставляет их строкой, а документ и база могут писать одно и то же имя в
/// разном регистре.
fn place_ghosts(
    doc: &[Entity],
    ghosts: &[&DbTableDTO],
    db_relations: &[DbRelationDTO],
) -> Vec<(f64, f64)> {
    let fixed: Vec<FixedTable> = doc
        .iter()
        .filter_map(|entity| {
            let (x, y) = (entity.pos_x?, entity.pos_y?);
            let columns: Vec<&str> = entity.fields.iter().map(|f| f.name.as_str()).collect();
            let (w, h) = layout::size_of(&entity.name, &columns);
            Some(FixedTable {
                name: key(&entity.name),
                x,
                y,
                w,
                h,
            })
        })
        .collect();

    let free: Vec<FreeTable> = ghosts
        .iter()
        .map(|table| {
            let columns: Vec<&str> = table.fields.iter().map(|f| f.name.as_str()).collect();
            let (w, h) = layout::size_of(&table.name, &columns);
            FreeTable {
                name: key(&table.name),
                w,
                h,
            }
        })
        .collect();

    let edges: Vec<Edge> = db_relations
        .iter()
        .map(|r| Edge {
            from: key(&r.from_table),
            to: key(&r.to_table),
        })
        .collect();

    layout::place(&fixed, &free, &edges)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::db_import::schema::dto::DbTableDTO;

    fn field(name: &str, pk: bool, nullable: bool) -> EntityField {
        EntityField {
            name: name.to_string(),
            type_: "int".into(),
            req: !nullable,
            nullable,
            pk,
            desc: String::new(),
            note: String::new(),
            example: String::new(),
            enum_: vec![],
        }
    }

    fn entity(id: &str, name: &str, fields: Vec<EntityField>) -> Entity {
        Entity {
            id: id.to_string(),
            name: name.to_string(),
            desc: String::new(),
            fields,
            pos_x: Some(40.0),
            pos_y: Some(40.0),
        }
    }

    fn table(name: &str, fields: Vec<EntityField>) -> DbTableDTO {
        DbTableDTO {
            name: name.to_string(),
            desc: String::new(),
            fields,
        }
    }

    fn schema(tables: Vec<DbTableDTO>, relations: Vec<DbRelationDTO>) -> DbIntrospectDTO {
        DbIntrospectDTO {
            schema: "public".into(),
            tables,
            relations,
            notices: vec![],
        }
    }

    fn fk(from_table: &str, from_column: &str, to_table: &str, to_column: &str) -> DbRelationDTO {
        DbRelationDTO {
            from_table: from_table.to_string(),
            from_column: from_column.to_string(),
            to_table: to_table.to_string(),
            to_column: to_column.to_string(),
        }
    }

    /// Главное требование: таблица, известная обеим сторонам, остаётся одна.
    #[test]
    fn a_table_known_to_both_sides_is_reported_once() {
        let doc = vec![entity("e1", "users", vec![field("id", true, false)])];
        let db = schema(vec![table("users", vec![field("id", true, false)])], vec![]);

        let result = compare(&doc, &[], db);

        assert_eq!(result.tables.len(), 1);
        assert_eq!(result.tables[0].status, DiffStatus::Same);
        assert_eq!(result.tables[0].id.as_deref(), Some("e1"));
        assert_eq!(result.summary.tables_only_in_db, 0);
        assert_eq!(result.summary.tables_only_in_doc, 0);
    }

    /// PostgreSQL сворачивает незакавыченные имена в нижний регистр, а в
    /// документе имя пишет человек — из-за регистра таблица не должна двоиться.
    #[test]
    fn names_are_matched_ignoring_case() {
        let doc = vec![entity("e1", "Users", vec![field("Id", true, false)])];
        let db = schema(vec![table("users", vec![field("id", true, false)])], vec![]);

        let result = compare(&doc, &[], db);

        assert_eq!(result.tables.len(), 1);
        assert_eq!(result.tables[0].status, DiffStatus::Same);
        assert_eq!(result.tables[0].columns.len(), 1);
        assert_eq!(
            result.tables[0].columns[0].name, "Id",
            "показываем написание документа"
        );
    }

    /// Описанного в документе в базе может не быть — это и есть первый повод
    /// сравнивать.
    #[test]
    fn a_table_the_database_does_not_have_stays_the_documents_own() {
        let doc = vec![entity("e1", "drafts", vec![field("id", true, false)])];
        let db = schema(vec![], vec![]);

        let result = compare(&doc, &[], db);

        assert_eq!(result.tables[0].status, DiffStatus::OnlyInDoc);
        assert!(result.tables[0]
            .columns
            .iter()
            .all(|c| c.status == DiffStatus::OnlyInDoc));
        assert_eq!(result.summary.tables_only_in_doc, 1);
        assert_eq!(
            result.summary.columns_only_in_doc, 0,
            "колонки ненайденной таблицы отдельно не считаем"
        );
    }

    /// Таблице, которой на диаграмме нет, сравнение само ищет место: рисовать
    /// её всё равно где нельзя — она встанет поверх чужой.
    #[test]
    fn a_table_missing_from_the_diagram_comes_back_placed() {
        let doc = vec![entity("e1", "users", vec![field("id", true, false)])];
        let db = schema(
            vec![
                table("users", vec![field("id", true, false)]),
                table(
                    "orders",
                    vec![field("id", true, false), field("user_id", false, false)],
                ),
            ],
            vec![fk("users", "id", "orders", "user_id")],
        );

        let result = compare(&doc, &[], db);

        let ghost = result.tables.iter().find(|t| t.name == "orders").unwrap();
        assert_eq!(ghost.status, DiffStatus::OnlyInDb);
        assert!(
            ghost.id.is_none(),
            "у призрака нет id: его нет в базе документа"
        );
        assert!(ghost.x.is_some() && ghost.y.is_some(), "место посчитано");
        assert_ne!(
            (ghost.x, ghost.y),
            (Some(40.0), Some(40.0)),
            "не поверх стоящей таблицы"
        );
        assert_eq!(result.summary.tables_only_in_db, 1);
    }

    /// Колонки тоже сводятся в одну таблицу: сначала описанные, потом чужие.
    #[test]
    fn columns_keep_document_order_and_the_databases_extras_follow() {
        let doc = vec![entity(
            "e1",
            "users",
            vec![field("id", true, false), field("nickname", false, true)],
        )];
        let db = schema(
            vec![table(
                "users",
                vec![field("id", true, false), field("email", false, false)],
            )],
            vec![],
        );

        let result = compare(&doc, &[], db);
        let columns = &result.tables[0].columns;

        let seen: Vec<(&str, DiffStatus)> = columns
            .iter()
            .map(|c| (c.name.as_str(), c.status))
            .collect();
        assert_eq!(
            seen,
            vec![
                ("id", DiffStatus::Same),
                ("nickname", DiffStatus::OnlyInDoc),
                ("email", DiffStatus::OnlyInDb),
            ]
        );
        assert_eq!(result.tables[0].status, DiffStatus::Differs);
        assert_eq!(result.summary.columns_only_in_doc, 1);
        assert_eq!(result.summary.columns_only_in_db, 1);
    }

    /// Флаги — единственное, что сравнивается надёжно: в документе тип пишет
    /// человек, и расхождение типов на нём не построишь.
    #[test]
    fn a_flag_that_diverges_marks_the_column_and_its_table() {
        let doc = vec![entity("e1", "users", vec![field("email", false, true)])];
        let db = schema(
            vec![table("users", vec![field("email", false, false)])],
            vec![],
        );

        let result = compare(&doc, &[], db);
        let column = &result.tables[0].columns[0];

        assert_eq!(column.status, DiffStatus::Differs);
        assert_eq!(column.mismatch, vec![Mismatch::Nullable]);
        assert_eq!(column.doc_type.as_deref(), Some("int"));
        assert_eq!(column.db_type.as_deref(), Some("int"));
        assert_eq!(result.tables[0].status, DiffStatus::Differs);
        assert_eq!(result.summary.columns_differ, 1);
        assert_eq!(result.summary.tables_differ, 1);
    }

    /// Холст даёт нарисовать связь в любую сторону, база же всегда называет
    /// первичной ту сторону, на которую ссылаются. Это одна и та же связь.
    #[test]
    fn a_relation_drawn_backwards_is_the_same_relation() {
        let doc = vec![
            entity("e1", "users", vec![field("id", true, false)]),
            entity("e2", "orders", vec![field("user_id", false, false)]),
        ];
        let drawn = vec![EntityRelation {
            id: "r1".into(),
            from_entity: "e2".into(),
            from_field: "user_id".into(),
            to_entity: "e1".into(),
            to_field: "id".into(),
        }];
        let db = schema(
            vec![
                table("users", vec![field("id", true, false)]),
                table("orders", vec![field("user_id", false, false)]),
            ],
            vec![fk("users", "id", "orders", "user_id")],
        );

        let result = compare(&doc, &drawn, db);

        assert_eq!(result.relations.len(), 1);
        assert_eq!(result.relations[0].status, DiffStatus::Same);
        assert_eq!(result.summary.relations_only_in_db, 0);
        assert_eq!(result.summary.relations_only_in_doc, 0);
    }

    /// Внешний ключ, который есть в базе, но не нарисован, — такое же
    /// расхождение, как недостающая колонка.
    #[test]
    fn a_foreign_key_nobody_drew_comes_back_as_the_databases_own() {
        let doc = vec![
            entity("e1", "users", vec![field("id", true, false)]),
            entity("e2", "orders", vec![field("user_id", false, false)]),
        ];
        let db = schema(
            vec![
                table("users", vec![field("id", true, false)]),
                table("orders", vec![field("user_id", false, false)]),
            ],
            vec![fk("users", "id", "orders", "user_id")],
        );

        let result = compare(&doc, &[], db);

        assert_eq!(result.relations.len(), 1);
        assert_eq!(result.relations[0].status, DiffStatus::OnlyInDb);
        assert_eq!(result.relations[0].from_table, "users");
        assert_eq!(result.relations[0].to_table, "orders");
        assert_eq!(result.summary.relations_only_in_db, 1);
    }
}
