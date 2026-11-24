use crate::domain::catalog::dto::CreateNodeDTO;
use crate::domain::catalog::entity::NodeKind;
use crate::domain::catalog::repository::CatalogRepository;
use crate::domain::doc_erd::entity::dto::{EntityPositionDTO, UpdateEntityDTO};
use crate::domain::doc_erd::entity::entity::Entity;
use crate::domain::doc_erd::entity::repository::EntityRepository;
use crate::domain::doc_erd::entity_relation::dto::RelationEndpointsDTO;
use crate::domain::doc_erd::entity_relation::repository::RelationRepository;
use crate::domain::doc_erd::import::dto::{ImportRelationDTO, ImportTableDTO};
use crate::domain::doc_erd::import::entity::ImportErdReport;
use crate::domain::doc_erd::import::layout::{self, Edge, FixedTable, FreeTable};
use crate::repository::sqlite::catalog::CatalogRepo;
use crate::repository::sqlite::entity::EntityRepo;
use crate::repository::sqlite::entity_relation::RelationRepo;
use crate::service::catalog::create_tree_node;
use crate::state::AppState;
use std::collections::{HashMap, HashSet};

/// Импорт ERD из файла.
///
/// Диаграмму выбирает сам файл — по своему `id`, как и у doc-api. Нет такой
/// диаграммы — она заводится под этим же id; есть — файл дописывается в неё:
/// таблицы опознаются по имени, связи — по паре концов.
///
/// Собран одной командой ради id сущностей: в файле их нет, а связи адресуют
/// таблицы именами. Id выдаёт база при вставке, и сопоставление «имя → id»
/// живёт здесь же — вызывающей стороне не приходится вести его самой и
/// ходить за каждой таблицей отдельно.
///
/// Здесь же считается и раскладка: расставить таблицы так, чтобы связи
/// читались, можно только зная разом и файл, и то, что уже лежит на холсте, —
/// а это видно только отсюда. Того, чего в файле нет, импорт не трогает: ни
/// таблицу, ни связь он не удаляет, и уже расставленные таблицы не двигает.
pub async fn import_erd(
    state: &AppState,
    node: CreateNodeDTO,
    tables: Vec<ImportTableDTO>,
    relations: Vec<ImportRelationDTO>,
) -> Result<ImportErdReport, String> {
    check_file(&tables)?;

    let entities = EntityRepo::new(&state.db);

    let (erd_id, doc_name, created) = match target(state, &node).await? {
        Some(found) => (found.0, found.1, false),
        None => {
            let created = create_tree_node(state, &node).await?;
            (created.id, created.name, true)
        }
    };

    // Уже лежащие на диаграмме таблицы: по ним импорт узнаёт свои и по ним же
    // потом ищет место для новых.
    let existing = entities.all_by_erd(&erd_id).await?;

    let mut id_of: HashMap<&str, String> = HashMap::new();
    let mut fresh: Vec<&ImportTableDTO> = Vec::new();
    let mut report = ImportErdReport {
        doc_id: erd_id.clone(),
        doc_name,
        created,
        tables_added: 0,
        tables_updated: 0,
        relations_added: 0,
    };

    for table in &tables {
        let id = match existing.iter().find(|kept| kept.name == table.schema.name) {
            Some(kept) => {
                entities
                    .update(&UpdateEntityDTO {
                        id: kept.id.clone(),
                        name: table.schema.name.clone(),
                        desc: table.schema.desc.clone(),
                        fields: table.schema.fields.clone(),
                    })
                    .await?;
                report.tables_updated += 1;
                kept.id.clone()
            }
            None => {
                let id = entities.create_for_erd(&erd_id, &table.schema).await?;
                fresh.push(table);
                report.tables_added += 1;
                id
            }
        };

        id_of.insert(table.schema.name.as_str(), id);
    }

    let relation_repo = RelationRepo::new(&state.db);

    // Связь, которая уже есть, второй раз не заводится: на пару концов стоит
    // UNIQUE, и повторный импорт того же файла упал бы на нём.
    let drawn_before = relation_repo.by_erd(&erd_id).await?;
    let mut drawn: HashSet<(String, String)> = drawn_before
        .iter()
        .map(|relation| {
            ends(
                &relation.from_entity,
                &relation.from_field,
                &relation.to_entity,
                &relation.to_field,
            )
        })
        .collect();

    for relation in &relations {
        let from_entity = entity_id(&id_of, &relation.from_table)?;
        let to_entity = entity_id(&id_of, &relation.to_table)?;

        if !drawn.insert(ends(
            &from_entity,
            &relation.from_column,
            &to_entity,
            &relation.to_column,
        )) {
            continue;
        }

        relation_repo
            .create(&RelationEndpointsDTO {
                from_entity,
                from_field: relation.from_column.clone(),
                to_entity,
                to_field: relation.to_column.clone(),
            })
            .await?;
        report.relations_added += 1;
    }

    let positions = arrange(&existing, &fresh, &relations, &drawn_before, &id_of);
    entities.update_positions(&positions).await?;

    Ok(report)
}

/// Место для таблиц, которые его ещё не имеют: новых из файла и тех давних,
/// что лежат в базе без координат (их раскладывала сцена при каждом открытии).
///
/// Связи берутся и из файла, и из диаграммы: новая таблица должна встать рядом
/// со своей соседкой независимо от того, в этом ли файле описана связь между
/// ними.
fn arrange(
    existing: &[Entity],
    fresh: &[&ImportTableDTO],
    relations: &[ImportRelationDTO],
    drawn_before: &[crate::domain::doc_erd::entity_relation::entity::EntityRelation],
    id_of: &HashMap<&str, String>,
) -> Vec<EntityPositionDTO> {
    let size_of_entity = |entity: &Entity| {
        let columns: Vec<&str> = entity.fields.iter().map(|f| f.name.as_str()).collect();
        layout::size_of(&entity.name, &columns)
    };

    let mut fixed: Vec<FixedTable> = Vec::new();
    let mut free: Vec<FreeTable> = Vec::new();
    let mut free_ids: Vec<String> = Vec::new();

    for entity in existing {
        let (w, h) = size_of_entity(entity);
        match (entity.pos_x, entity.pos_y) {
            (Some(x), Some(y)) => fixed.push(FixedTable {
                name: entity.name.clone(),
                x,
                y,
                w,
                h,
            }),
            _ => {
                free.push(FreeTable {
                    name: entity.name.clone(),
                    w,
                    h,
                });
                free_ids.push(entity.id.clone());
            }
        }
    }

    for table in fresh {
        let columns: Vec<&str> = table
            .schema
            .fields
            .iter()
            .map(|field| field.name.as_str())
            .collect();
        let (w, h) = layout::size_of(&table.schema.name, &columns);
        free.push(FreeTable {
            name: table.schema.name.clone(),
            w,
            h,
        });
        free_ids.push(id_of[table.schema.name.as_str()].clone());
    }

    // Связи диаграммы адресованы id сущностей, раскладка — именами.
    let name_of: HashMap<&str, &str> = existing
        .iter()
        .map(|entity| (entity.id.as_str(), entity.name.as_str()))
        .collect();

    let mut edges: Vec<Edge> = relations
        .iter()
        .map(|relation| Edge {
            from: relation.from_table.clone(),
            to: relation.to_table.clone(),
        })
        .collect();

    for relation in drawn_before {
        if let (Some(from), Some(to)) = (
            name_of.get(relation.from_entity.as_str()),
            name_of.get(relation.to_entity.as_str()),
        ) {
            edges.push(Edge {
                from: (*from).to_string(),
                to: (*to).to_string(),
            });
        }
    }

    layout::place(&fixed, &free, &edges)
        .into_iter()
        .zip(free_ids)
        .map(|((x, y), id)| EntityPositionDTO { id, x, y })
        .collect()
}

/// Диаграмма, на которую указывает id из файла: её id и имя. `None` — такой
/// диаграммы ещё нет, её нужно завести.
async fn target(
    state: &AppState,
    node: &CreateNodeDTO,
) -> Result<Option<(String, String)>, String> {
    let Some(id) = node.id.clone() else {
        return Ok(None);
    };

    let Some(found) = CatalogRepo::new(&state.db).find(&id).await? else {
        return Ok(None);
    };

    if found.kind != NodeKind::DocErd {
        return Err(format!(
            "id {id} в файле занят узлом «{}» — это не ERD-диаграмма",
            found.name
        ));
    }

    Ok(Some((found.id, found.name)))
}

/// Ненаправленный ключ связи. Та же пара колонок в обратную сторону — не
/// вторая связь, а спор о том, где сторона первичного ключа.
fn ends(from_entity: &str, from_field: &str, to_entity: &str, to_field: &str) -> (String, String) {
    let a = format!("{from_entity}.{from_field}");
    let b = format!("{to_entity}.{to_field}");
    if a <= b {
        (a, b)
    } else {
        (b, a)
    }
}

/// Таблицы опознаются по имени, поэтому два одинаковых имени в файле — это
/// вопрос без ответа: какое из описаний автор считал настоящим. На имена
/// ссылаются ещё и связи.
fn check_file(tables: &[ImportTableDTO]) -> Result<(), String> {
    let mut names: HashSet<&str> = HashSet::new();

    for table in tables {
        if !names.insert(table.schema.name.as_str()) {
            return Err(format!(
                "Импорт ERD: в файле две таблицы «{}»",
                table.schema.name
            ));
        }
    }

    Ok(())
}

/// Id таблицы, которая есть в файле. Имени, которого среди них нет,
/// соответствовать нечему — связь повисла бы в воздухе.
fn entity_id(id_of: &HashMap<&str, String>, table: &str) -> Result<String, String> {
    id_of
        .get(table)
        .cloned()
        .ok_or_else(|| format!("Импорт ERD: в файле нет таблицы «{table}»"))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::catalog::dto::NodePayload;
    use crate::domain::doc_erd::entity::dto::CreateEntityDTO;
    use crate::domain::doc_erd::entity::entity::EntityField;
    use crate::repository::sqlite::test_db;
    use sqlx::{Executor, SqlitePool};

    async fn app() -> (AppState, tempfile::TempDir) {
        let dir = tempfile::tempdir().unwrap();
        let db = test_db::migrated().await;
        db.execute("INSERT INTO platforms (id,name) VALUES ('p1','P')")
            .await
            .unwrap();

        (AppState::for_tests(db, dir.path()), dir)
    }

    fn header(id: Option<&str>, name: &str) -> CreateNodeDTO {
        CreateNodeDTO {
            id: id.map(str::to_string),
            platform_id: "p1".to_string(),
            parent_id: None,
            name: name.to_string(),
            payload: NodePayload::DocErd,
        }
    }

    fn field(name: &str) -> EntityField {
        EntityField {
            name: name.to_string(),
            type_: "uuid".to_string(),
            req: true,
            nullable: false,
            pk: name == "id",
            desc: String::new(),
            note: String::new(),
            example: String::new(),
            enum_: vec![],
        }
    }

    fn table(name: &str, columns: &[&str]) -> ImportTableDTO {
        ImportTableDTO {
            schema: CreateEntityDTO {
                name: name.to_string(),
                desc: String::new(),
                fields: columns.iter().map(|c| field(c)).collect(),
            },
        }
    }

    fn relation(from: (&str, &str), to: (&str, &str)) -> ImportRelationDTO {
        ImportRelationDTO {
            from_table: from.0.to_string(),
            from_column: from.1.to_string(),
            to_table: to.0.to_string(),
            to_column: to.1.to_string(),
        }
    }

    async fn count(db: &SqlitePool, what: &str) -> i64 {
        sqlx::query_scalar(&format!("SELECT COUNT(*) FROM {what}"))
            .fetch_one(db)
            .await
            .unwrap()
    }

    /// Id из файла становится id диаграммы — иначе следующий импорт того же
    /// файла её бы не нашёл.
    #[tokio::test]
    async fn the_id_from_the_file_becomes_the_id_of_the_diagram() {
        let (state, _dir) = app().await;

        let report = import_erd(
            &state,
            header(Some("erd-1"), "Биллинг"),
            vec![table("accounts", &["id"])],
            vec![],
        )
        .await
        .unwrap();

        assert!(report.created);
        assert_eq!(report.doc_id, "erd-1");
        assert_eq!(report.tables_added, 1);
    }

    /// Тот же файл второй раз ничего не задваивает: ни таблицу, ни связь —
    /// на пару концов связи стоит UNIQUE, и повтор упал бы на нём.
    #[tokio::test]
    async fn the_same_file_twice_leaves_one_copy_of_everything() {
        let (state, _dir) = app().await;
        let file = || {
            (
                vec![
                    table("accounts", &["id"]),
                    table("payments", &["id", "account_id"]),
                ],
                vec![relation(("accounts", "id"), ("payments", "account_id"))],
            )
        };

        let (tables, relations) = file();
        import_erd(&state, header(Some("erd-1"), "Биллинг"), tables, relations)
            .await
            .unwrap();

        let (tables, relations) = file();
        let report = import_erd(&state, header(Some("erd-1"), "Биллинг"), tables, relations)
            .await
            .unwrap();

        assert!(!report.created, "диаграмма должна была найтись по id");
        assert_eq!(report.tables_updated, 2);
        assert_eq!(report.tables_added, 0);
        assert_eq!(report.relations_added, 0, "связь уже нарисована");
        assert_eq!(count(&state.db, "entities").await, 2);
        assert_eq!(count(&state.db, "entity_relation").await, 1);
    }

    /// Дописанная таблица встаёт рядом со своей соседкой: связь между ними
    /// должна читаться, а не тянуться через полдиаграммы. Расставленное руками
    /// при этом не двигается.
    #[tokio::test]
    async fn a_new_table_lands_next_to_the_one_it_is_linked_to() {
        let (state, _dir) = app().await;
        import_erd(
            &state,
            header(Some("erd-1"), "Биллинг"),
            vec![table("accounts", &["id"])],
            vec![],
        )
        .await
        .unwrap();
        sqlx::query("UPDATE entities SET pos_x = 500, pos_y = 700 WHERE name = 'accounts'")
            .execute(&state.db)
            .await
            .unwrap();

        let report = import_erd(
            &state,
            header(Some("erd-1"), "Биллинг"),
            vec![
                table("accounts", &["id"]),
                table("payments", &["id", "account_id"]),
            ],
            vec![relation(("accounts", "id"), ("payments", "account_id"))],
        )
        .await
        .unwrap();

        assert_eq!(report.tables_added, 1);
        assert_eq!(report.tables_updated, 1);

        let kept: (f64, f64) =
            sqlx::query_as("SELECT pos_x, pos_y FROM entities WHERE name = 'accounts'")
                .fetch_one(&state.db)
                .await
                .unwrap();
        assert_eq!(
            kept,
            (500.0, 700.0),
            "расставленную таблицу импорт не двигает"
        );

        let added: (f64, f64) =
            sqlx::query_as("SELECT pos_x, pos_y FROM entities WHERE name = 'payments'")
                .fetch_one(&state.db)
                .await
                .unwrap();
        assert!(
            added.0 > 500.0 + 170.0,
            "потомок должен встать справа от родителя: {added:?}"
        );
        assert_eq!(
            added.1, 700.0,
            "и на его высоте — тогда связь идёт по горизонтали"
        );
    }

    /// Колонки таблицы правятся целиком: что в файле, то и в диаграмме.
    #[tokio::test]
    async fn columns_of_an_existing_table_come_from_the_file() {
        let (state, _dir) = app().await;
        import_erd(
            &state,
            header(Some("erd-1"), "Биллинг"),
            vec![table("accounts", &["id"])],
            vec![],
        )
        .await
        .unwrap();

        import_erd(
            &state,
            header(Some("erd-1"), "Биллинг"),
            vec![table("accounts", &["id", "email"])],
            vec![],
        )
        .await
        .unwrap();

        let columns: Vec<String> = sqlx::query_scalar(
            "SELECT name FROM entity_field \
             WHERE entity_id = (SELECT id FROM entities WHERE name = 'accounts') \
             ORDER BY sort_ord",
        )
        .fetch_all(&state.db)
        .await
        .unwrap();
        assert_eq!(columns, ["id", "email"]);
    }

    /// Файл, где таблица описана дважды, не применяется вовсе: на имена таблиц
    /// ссылаются связи.
    #[tokio::test]
    async fn a_file_that_describes_one_table_twice_is_rejected_before_any_write() {
        let (state, _dir) = app().await;

        let err = import_erd(
            &state,
            header(Some("erd-1"), "Биллинг"),
            vec![table("accounts", &["id"]), table("accounts", &["id"])],
            vec![],
        )
        .await
        .unwrap_err();

        assert!(err.contains("accounts"), "невнятная подсказка: {err}");
        assert_eq!(
            count(&state.db, "catalog_node").await,
            0,
            "до записи дело не дошло"
        );
    }

    /// Id занят чем-то другим — заводить диаграмму рядом бессмысленно.
    #[tokio::test]
    async fn an_id_that_belongs_to_a_doc_api_stops_the_import() {
        let (state, _dir) = app().await;
        state
            .db
            .execute(sqlx::raw_sql(
                "INSERT INTO catalog_node (id,platform_id,kind,name) \
                 VALUES ('erd-1','p1','doc_api','Документ API')",
            ))
            .await
            .unwrap();

        let err = import_erd(
            &state,
            header(Some("erd-1"), "Биллинг"),
            vec![table("accounts", &["id"])],
            vec![],
        )
        .await
        .unwrap_err();

        assert!(err.contains("Документ API"), "невнятная подсказка: {err}");
    }
}
