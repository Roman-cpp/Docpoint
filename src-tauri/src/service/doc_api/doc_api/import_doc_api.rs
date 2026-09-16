use crate::domain::catalog::dto::CreateNodeDTO;
use crate::domain::catalog::entity::NodeKind;
use crate::domain::catalog::repository::CatalogRepository;
use crate::domain::doc_api::doc_api::dto::SyncDocApiDTO;
use crate::domain::doc_api::doc_api::entity::{ImportReport, SyncReport};
use crate::domain::doc_api::group::dto::CreateGroupDTO;
use crate::domain::doc_api::group::repository::GroupRepository;
use crate::repository::sqlite::catalog::CatalogRepo;
use crate::repository::sqlite::group::GroupRepo;
use crate::service::catalog::create_tree_node;
use crate::state::AppState;

use super::sync_doc_api::sync;

/// Импорт doc-api из файла.
///
/// Документ выбирает сам файл — по своему `id`. Если документа с таким id в
/// дереве ещё нет, он заводится под этим же id: файл и документ узнают друг
/// друга при следующем импорте, и «дописал эндпоинт — залил файл» работает
/// без вопроса «а в какой документ».
///
/// Id в файле может не быть — в рукописном его обычно и нет. Тогда импорт
/// ведёт себя как раньше: каждый раз заводит новый документ. Место в дереве
/// задаёт вызывающая сторона — импорт кладёт документ туда, где открыт
/// проводник.
pub async fn import_doc(
    state: &AppState,
    node: CreateNodeDTO,
    groups: Vec<CreateGroupDTO>,
) -> Result<ImportReport, String> {
    if let Some(id) = node.id.clone() {
        if let Some(found) = CatalogRepo::new(&state.db).find(&id).await? {
            // Id из файла указывает на что-то другое — молча создать рядом
            // документ нельзя: id занят, и следующий импорт придёт сюда же.
            if found.kind != NodeKind::DocApi {
                return Err(format!(
                    "id {id} в файле занят узлом «{}» — это не документ API",
                    found.name
                ));
            }

            let changes = sync(
                &state.db,
                SyncDocApiDTO {
                    doc_id: id,
                    prefix: node.payload.doc_api_prefix().map(str::to_string),
                    groups,
                },
            )
            .await?;

            return Ok(ImportReport {
                doc_id: found.id,
                // Имя документа файл не меняет: как документ назван и где
                // лежит — дело пользователя. В отчёт оно попадает, чтобы было
                // видно, в какой документ прилетел файл.
                doc_name: found.name,
                created: false,
                changes,
            });
        }
    }

    let created = create_tree_node(state, &node).await?;

    GroupRepo::new(&state.db)
        .create(&created.id, &groups)
        .await?;

    Ok(ImportReport {
        doc_id: created.id,
        doc_name: created.name,
        created: true,
        changes: SyncReport {
            groups_added: groups.len(),
            endpoints_added: groups.iter().map(|g| g.endpoints.len()).sum(),
            endpoints_updated: 0,
        },
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::catalog::dto::{NewNode, NodePayload};
    use crate::repository::sqlite::test_db;
    use serde_json::json;
    use sqlx::{Executor, SqlitePool};

    /// Платформа, в каталоге которой идёт импорт.
    async fn app() -> (AppState, tempfile::TempDir) {
        let dir = tempfile::tempdir().unwrap();
        let db = test_db::migrated().await;
        db.execute("INSERT INTO platforms (id,name) VALUES ('p1','P')")
            .await
            .unwrap();

        (AppState::for_tests(db, dir.path()), dir)
    }

    /// Заголовок файла глазами бэкенда: id из файла плюс имя и префикс.
    fn header(id: Option<&str>, name: &str) -> CreateNodeDTO {
        CreateNodeDTO {
            id: id.map(str::to_string),
            platform_id: "p1".to_string(),
            parent_id: None,
            name: name.to_string(),
            payload: NodePayload::DocApi {
                prefix: "/api/v1".to_string(),
            },
        }
    }

    fn groups(paths: &[&str]) -> Vec<CreateGroupDTO> {
        let endpoints: Vec<_> = paths
            .iter()
            .map(|path| json!({ "method": "GET", "path": path, "name": "X" }))
            .collect();
        serde_json::from_value(json!([{ "label": "Core", "endpoints": endpoints }])).unwrap()
    }

    async fn count(db: &SqlitePool, what: &str) -> i64 {
        sqlx::query_scalar(&format!("SELECT COUNT(*) FROM {what}"))
            .fetch_one(db)
            .await
            .unwrap()
    }

    /// Id из файла становится id документа — иначе следующий импорт того же
    /// файла его бы не нашёл.
    #[tokio::test]
    async fn the_id_from_the_file_becomes_the_id_of_the_document() {
        let (state, _dir) = app().await;

        let report = import_doc(&state, header(Some("api-1"), "API"), groups(&["/ping"]))
            .await
            .unwrap();

        assert!(report.created);
        assert_eq!(report.doc_id, "api-1");
        assert_eq!(count(&state.db, "doc_api").await, 1);
    }

    /// То, ради чего id и заводился: дописали в файл эндпоинт, залили тот же
    /// файл — документ один, эндпоинтов стало больше.
    #[tokio::test]
    async fn the_same_file_again_updates_the_document_it_created() {
        let (state, _dir) = app().await;
        import_doc(&state, header(Some("api-1"), "API"), groups(&["/ping"]))
            .await
            .unwrap();

        let report = import_doc(
            &state,
            header(Some("api-1"), "API"),
            groups(&["/ping", "/health"]),
        )
        .await
        .unwrap();

        assert!(!report.created, "документ должен был найтись по id");
        assert_eq!(report.doc_id, "api-1");
        assert_eq!(report.changes.endpoints_added, 1);
        assert_eq!(report.changes.endpoints_updated, 1);
        assert_eq!(
            count(&state.db, "catalog_node").await,
            1,
            "второго документа не появилось"
        );
        assert_eq!(count(&state.db, "endpoint").await, 2);
    }

    /// Имя документа файл не меняет: как документ назван — дело пользователя,
    /// а опознаётся он по id.
    #[tokio::test]
    async fn a_renamed_document_keeps_its_name_and_is_still_found() {
        let (state, _dir) = app().await;
        import_doc(&state, header(Some("api-1"), "API"), groups(&["/ping"]))
            .await
            .unwrap();
        sqlx::query("UPDATE catalog_node SET name = 'Мой API' WHERE id = 'api-1'")
            .execute(&state.db)
            .await
            .unwrap();

        let report = import_doc(&state, header(Some("api-1"), "API"), groups(&["/ping"]))
            .await
            .unwrap();

        assert_eq!(report.doc_name, "Мой API");
        assert_eq!(count(&state.db, "catalog_node").await, 1);
    }

    /// Файла без id это всё не касается: он ведёт себя как раньше и каждый раз
    /// заводит новый документ.
    #[tokio::test]
    async fn a_file_without_an_id_creates_a_new_document_every_time() {
        let (state, _dir) = app().await;

        import_doc(&state, header(None, "Первый"), groups(&["/ping"]))
            .await
            .unwrap();
        let report = import_doc(&state, header(None, "Второй"), groups(&["/ping"]))
            .await
            .unwrap();

        assert!(report.created);
        assert_eq!(count(&state.db, "doc_api").await, 2);
    }

    /// Id занят чем-то другим — это не повод завести документ рядом: id уже
    /// не свободен, и следующий импорт пришёл бы сюда же.
    #[tokio::test]
    async fn an_id_that_belongs_to_a_catalog_stops_the_import() {
        let (state, _dir) = app().await;
        CatalogRepo::new(&state.db)
            .create_with_id(
                "api-1",
                &NewNode {
                    platform_id: "p1",
                    parent_id: None,
                    kind: NodeKind::Catalog,
                    name: "Папка",
                },
            )
            .await
            .unwrap();

        let err = import_doc(&state, header(Some("api-1"), "API"), groups(&["/ping"]))
            .await
            .unwrap_err();

        assert!(err.contains("Папка"), "невнятная подсказка: {err}");
    }
}
