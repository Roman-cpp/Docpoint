use crate::domain::catalog::dto::CreateNodeDTO;
use crate::domain::catalog::entity::NodeKind;
use crate::domain::catalog::repository::CatalogRepository;
use crate::domain::websocket::doc_websocket::entity::ImportWebsocketReport;
use crate::domain::websocket::doc_websocket::repository::DocWebsocketRepository;
use crate::domain::websocket::message::dto::{
    CreateWebsocketMessageDTO, ImportWebsocketMessageDTO, UpdateWebsocketMessageDTO,
};
use crate::domain::websocket::message::repository::WebsocketMessageRepository;
use crate::repository::sqlite::catalog::CatalogRepo;
use crate::repository::sqlite::doc_websocket::DocWebsocketRepo;
use crate::repository::sqlite::websocket_message::WebsocketMessageRepo;
use crate::service::catalog::create_tree_node;
use crate::state::AppState;
use std::collections::HashSet;

/// Импорт WebSocket-документа из файла.
///
/// Сокет выбирает сам файл — по своему `id`, как и у doc-api. Нет такого
/// сокета — он заводится под этим же id; есть — файл дописывается в него:
/// адрес берётся из файла, сообщения опознаются по имени.
///
/// Сообщения, которых в файле нет, остаются: файл описывает то, что в нём
/// написано, а не весь сокет целиком, — примеры кадров пользователь заводит и
/// руками.
pub async fn import_websocket(
    state: &AppState,
    node: CreateNodeDTO,
    messages: Vec<ImportWebsocketMessageDTO>,
) -> Result<ImportWebsocketReport, String> {
    check_file(&messages)?;

    let url = node.payload.doc_ws_url().unwrap_or_default().to_string();
    let repo = WebsocketMessageRepo::new(&state.db);

    if let Some(id) = node.id.clone() {
        if let Some(found) = CatalogRepo::new(&state.db).find(&id).await? {
            if found.kind != NodeKind::DocWs {
                return Err(format!(
                    "id {id} в файле занят узлом «{}» — это не WebSocket-документ",
                    found.name
                ));
            }

            DocWebsocketRepo::new(&state.db).update(&id, &url).await?;

            let existing = repo.by_websocket(&id).await?;
            let mut report = ImportWebsocketReport {
                doc_id: found.id,
                doc_name: found.name,
                created: false,
                messages_added: 0,
                messages_updated: 0,
            };

            for message in &messages {
                match existing.iter().find(|kept| kept.name == message.name) {
                    Some(kept) => {
                        repo.update(&UpdateWebsocketMessageDTO {
                            id: kept.id.clone(),
                            name: message.name.clone(),
                            payload: message.payload.clone(),
                            desc: message.desc.clone(),
                        })
                        .await?;
                        report.messages_updated += 1;
                    }
                    None => {
                        repo.create(&create_dto(&report.doc_id, message)).await?;
                        report.messages_added += 1;
                    }
                }
            }

            return Ok(report);
        }
    }

    let created = create_tree_node(state, &node).await?;

    for message in &messages {
        repo.create(&create_dto(&created.id, message)).await?;
    }

    Ok(ImportWebsocketReport {
        doc_id: created.id,
        doc_name: created.name,
        created: true,
        messages_added: messages.len(),
        messages_updated: 0,
    })
}

fn create_dto(
    websocket_id: &str,
    message: &ImportWebsocketMessageDTO,
) -> CreateWebsocketMessageDTO {
    CreateWebsocketMessageDTO {
        websocket_id: websocket_id.to_string(),
        name: message.name.clone(),
        payload: message.payload.clone(),
        desc: message.desc.clone(),
    }
}

/// Сообщения опознаются по имени, поэтому два одинаковых имени в файле — это
/// вопрос без ответа: какое из двух описаний автор считал настоящим.
fn check_file(messages: &[ImportWebsocketMessageDTO]) -> Result<(), String> {
    let mut names: HashSet<&str> = HashSet::new();

    for message in messages {
        if message.name.trim().is_empty() {
            return Err("у сообщения пустое имя — по нему оно и опознаётся".to_string());
        }
        if !names.insert(message.name.as_str()) {
            return Err(format!("в файле два сообщения с именем {:?}", message.name));
        }
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::catalog::dto::NodePayload;
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

    /// Заголовок файла глазами бэкенда: id из файла плюс имя и адрес.
    fn header(id: Option<&str>, name: &str, url: &str) -> CreateNodeDTO {
        CreateNodeDTO {
            id: id.map(str::to_string),
            platform_id: "p1".to_string(),
            parent_id: None,
            name: name.to_string(),
            payload: NodePayload::DocWs {
                url: url.to_string(),
            },
        }
    }

    fn message(name: &str, payload: &str) -> ImportWebsocketMessageDTO {
        ImportWebsocketMessageDTO {
            name: name.to_string(),
            payload: payload.to_string(),
            desc: String::new(),
        }
    }

    async fn count(db: &SqlitePool, what: &str) -> i64 {
        sqlx::query_scalar(&format!("SELECT COUNT(*) FROM {what}"))
            .fetch_one(db)
            .await
            .unwrap()
    }

    /// Id из файла становится id сокета — иначе следующий импорт того же файла
    /// его бы не нашёл.
    #[tokio::test]
    async fn the_id_from_the_file_becomes_the_id_of_the_socket() {
        let (state, _dir) = app().await;

        let report = import_websocket(
            &state,
            header(Some("ws-1"), "Stream", "wss://example.com/ws"),
            vec![message("Ping", "{\"op\":\"ping\"}")],
        )
        .await
        .unwrap();

        assert!(report.created);
        assert_eq!(report.doc_id, "ws-1");
        assert_eq!(report.messages_added, 1);
    }

    /// То, ради чего id и заводился: дописали сообщение в файл, импортировали
    /// снова — сокет один, сообщение добавилось, прежнее обновилось вместе с
    /// адресом.
    #[tokio::test]
    async fn the_same_file_again_updates_the_socket_it_created() {
        let (state, _dir) = app().await;
        import_websocket(
            &state,
            header(Some("ws-1"), "Stream", "wss://old.example.com"),
            vec![message("Ping", "было")],
        )
        .await
        .unwrap();

        let report = import_websocket(
            &state,
            header(Some("ws-1"), "Stream", "wss://new.example.com"),
            vec![message("Ping", "стало"), message("Pong", "{}")],
        )
        .await
        .unwrap();

        assert!(!report.created, "сокет должен был найтись по id");
        assert_eq!(report.messages_added, 1);
        assert_eq!(report.messages_updated, 1);
        assert_eq!(count(&state.db, "catalog_node").await, 1);
        assert_eq!(count(&state.db, "websocket_message").await, 2);

        let url: String = sqlx::query_scalar("SELECT url FROM doc_ws WHERE id = 'ws-1'")
            .fetch_one(&state.db)
            .await
            .unwrap();
        assert_eq!(url, "wss://new.example.com", "адрес берётся из файла");

        let payload: String =
            sqlx::query_scalar("SELECT payload FROM websocket_message WHERE name = 'Ping'")
                .fetch_one(&state.db)
                .await
                .unwrap();
        assert_eq!(payload, "стало");
    }

    /// Сообщение, заведённое руками, импорт не трогает: файл описывает то, что
    /// в нём написано, а не весь сокет целиком.
    #[tokio::test]
    async fn a_message_that_is_not_in_the_file_stays() {
        let (state, _dir) = app().await;
        import_websocket(
            &state,
            header(Some("ws-1"), "Stream", "wss://example.com"),
            vec![message("Ping", "{}")],
        )
        .await
        .unwrap();
        WebsocketMessageRepo::new(&state.db)
            .create(&CreateWebsocketMessageDTO {
                websocket_id: "ws-1".to_string(),
                name: "Моё".to_string(),
                payload: "{}".to_string(),
                desc: String::new(),
            })
            .await
            .unwrap();

        import_websocket(
            &state,
            header(Some("ws-1"), "Stream", "wss://example.com"),
            vec![message("Ping", "{}")],
        )
        .await
        .unwrap();

        let names: Vec<String> =
            sqlx::query_scalar("SELECT name FROM websocket_message ORDER BY name")
                .fetch_all(&state.db)
                .await
                .unwrap();
        assert_eq!(names, ["Ping", "Моё"]);
    }

    /// Два сообщения с одним именем в файле — вопрос без ответа: по имени они
    /// и опознаются.
    #[tokio::test]
    async fn two_messages_with_the_same_name_stop_the_import() {
        let (state, _dir) = app().await;

        let err = import_websocket(
            &state,
            header(Some("ws-1"), "Stream", "wss://example.com"),
            vec![message("Ping", "{}"), message("Ping", "{}")],
        )
        .await
        .unwrap_err();

        assert!(err.contains("Ping"), "невнятная подсказка: {err}");
        assert_eq!(
            count(&state.db, "catalog_node").await,
            0,
            "до записи дело не дошло"
        );
    }

    /// Id занят чем-то другим — заводить сокет рядом бессмысленно: id уже не
    /// свободен, и следующий импорт пришёл бы сюда же.
    #[tokio::test]
    async fn an_id_that_belongs_to_a_doc_api_stops_the_import() {
        let (state, _dir) = app().await;
        state
            .db
            .execute(sqlx::raw_sql(
                "INSERT INTO catalog_node (id,platform_id,kind,name) \
                 VALUES ('ws-1','p1','doc_api','Документ API')",
            ))
            .await
            .unwrap();

        let err = import_websocket(
            &state,
            header(Some("ws-1"), "Stream", "wss://example.com"),
            vec![],
        )
        .await
        .unwrap_err();

        assert!(err.contains("Документ API"), "невнятная подсказка: {err}");
    }
}
