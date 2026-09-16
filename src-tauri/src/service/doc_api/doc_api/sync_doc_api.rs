use std::collections::HashSet;

use crate::domain::doc_api::doc_api::dto::{DocApiPayload, SyncDocApiDTO};
use crate::domain::doc_api::doc_api::entity::SyncReport;
use crate::domain::doc_api::doc_api::repository::DocApiRepository;
use crate::domain::doc_api::endpoint::dto::{CreateEndpointDTO, UpdateEndpointDTO};
use crate::domain::doc_api::endpoint::entity::check_path_params;
use crate::domain::doc_api::endpoint::repository::EndpointRepository;
use crate::domain::doc_api::endpoint_request::repository::{
    resolve_values, EndpointRequestRepository, RequestTarget,
};
use crate::domain::doc_api::group::dto::CreateGroupDTO;
use crate::domain::doc_api::group::repository::GroupRepository;
use crate::repository::sqlite::doc_api::DocApiRepo;
use crate::repository::sqlite::endpoint::EndpointRepo;
use crate::repository::sqlite::endpoint_request::EndpointRequestRepo;
use crate::repository::sqlite::group::GroupRepo;
use sqlx::SqlitePool;

/// Методы, которые принимает `CHECK` таблицы `endpoint`. Проверяем список
/// сами: иначе опечатка в файле доезжает до SQLite и возвращается её
/// сообщением о нарушенном констрейнте, где нет ни метода, ни пути.
const METHODS: [&str; 7] = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"];

/// Дописывает файл в существующий документ.
///
/// Вызывается импортом, когда документ с id из файла уже есть в дереве.
///
/// В отличие от [`import_doc`](super::import_doc), который заводит документ с
/// нуля, эта операция сопоставляет содержимое файла с тем, что уже лежит в
/// документе, и дописывает разницу. Сопоставление идёт по естественным ключам:
/// группа — по названию, эндпоинт — по паре «метод + путь», набор «Try it» —
/// по имени внутри эндпоинта. Id из файла не используются: в рукописном файле
/// их нет, а те, что попадают туда экспортом, после переимпорта на другой
/// машине уже ничего не значат.
///
/// Импорт только добавляет и обновляет. Того, чего в файле нет, она не
/// трогает: рядом с описанием живут данные, которых в файле не бывает, —
/// значения параметров и наборы «Try it», заведённые руками, — и «привести
/// документ к файлу» означало бы их молча стереть.
pub(crate) async fn sync(db: &SqlitePool, doc: SyncDocApiDTO) -> Result<SyncReport, String> {
    let docs = DocApiRepo::new(db);

    if docs.find(&doc.doc_id).await?.is_none() {
        return Err("документ не найден: возможно, его удалили из дерева".to_string());
    }

    // Весь файл сверяется до первой записи. Импорт идёт не одной транзакцией,
    // а вставками по одной, и на середине файла падать ей нельзя: документ
    // живой, и половина изменений в нём хуже, чем ни одного.
    check_file(&doc.groups)?;

    // Префикса в файле может не быть — тогда прежний остаётся как есть.
    if let Some(prefix) = doc.prefix {
        docs.update(&doc.doc_id, &DocApiPayload { prefix }).await?;
    }

    let groups = GroupRepo::new(db);
    let endpoints = EndpointRepo::new(db);
    let requests = EndpointRequestRepo::new(db);

    let mut report = SyncReport::default();

    for group in &doc.groups {
        let group_id = match groups.find_by_label(&doc.doc_id, &group.label).await? {
            Some(id) => id,
            None => {
                report.groups_added += 1;
                groups.create_group(&doc.doc_id, &group.label).await?
            }
        };

        for endpoint in &group.endpoints {
            let found = endpoints
                .find_by_signature(&doc.doc_id, &endpoint.method, &endpoint.path)
                .await?;

            let endpoint_id = match found {
                Some(found) => {
                    endpoints.update(&update_dto(&found.id, endpoint)).await?;

                    // Эндпоинт, переложенный в файле в другую группу, переезжает
                    // вслед за файлом — иначе правка в файле выглядела бы как
                    // не применившаяся.
                    if found.group_id != group_id {
                        endpoints.move_to_group(&found.id, &group_id).await?;
                    }

                    report.endpoints_updated += 1;
                    found.id
                }
                None => {
                    report.endpoints_added += 1;
                    endpoints.create(&group_id, endpoint).await?
                }
            };

            for request in &endpoint.requests {
                requests
                    .upsert(&target(&endpoint_id, endpoint), request)
                    .await?;
            }
        }
    }

    Ok(report)
}

/// Эндпоинт из файла глазами наборов «Try it»: имена сегментов берутся из
/// пути, имена query-параметров — из описания в том же файле. Описание после
/// импорта становится актуальным, поэтому сверяться нужно именно с ним, а не
/// с тем, что лежало в базе до неё.
fn target<'a>(endpoint_id: &'a str, endpoint: &'a CreateEndpointDTO) -> RequestTarget<'a> {
    RequestTarget {
        endpoint_id,
        path: &endpoint.path,
        query_names: endpoint
            .query_params
            .iter()
            .map(|param| param.name.as_str())
            .collect(),
    }
}

/// Описание эндпоинта из файла, наложенное на уже существующий: правится всё,
/// кроме id. Наборы «Try it» сюда не входят — они пишутся отдельно, своим
/// репозиторием.
fn update_dto(id: &str, endpoint: &CreateEndpointDTO) -> UpdateEndpointDTO {
    UpdateEndpointDTO {
        id: id.to_string(),
        method: endpoint.method.clone(),
        path: endpoint.path.clone(),
        name: endpoint.name.clone(),
        description: endpoint.description.clone(),
        auth: endpoint.auth,
        path_params: endpoint.path_params.clone(),
        query_params: endpoint.query_params.clone(),
        body_params: endpoint.body_params.clone(),
        responses: endpoint.responses.clone(),
    }
}

/// Сверяет файл целиком: и то, что отбила бы база, и то, из-за чего
/// сопоставление стало бы неоднозначным.
///
/// Два одинаковых ключа в одном файле — это не «последний победил», а вопрос
/// без ответа: непонятно, какое из двух описаний автор считал настоящим.
fn check_file(groups: &[CreateGroupDTO]) -> Result<(), String> {
    let mut labels: HashSet<&str> = HashSet::new();
    let mut signatures: HashSet<(&str, &str)> = HashSet::new();

    for group in groups {
        if !labels.insert(group.label.as_str()) {
            return Err(format!("в файле две группы с названием {:?}", group.label));
        }

        for endpoint in &group.endpoints {
            if !METHODS.contains(&endpoint.method.as_str()) {
                return Err(format!(
                    "эндпоинт {:?}: неизвестный метод {:?}",
                    endpoint.path, endpoint.method
                ));
            }

            if !signatures.insert((endpoint.method.as_str(), endpoint.path.as_str())) {
                return Err(format!(
                    "в файле два эндпоинта {} {}",
                    endpoint.method, endpoint.path
                ));
            }

            check_path_params(&endpoint.method, &endpoint.path, &endpoint.path_params)?;

            let target = target("", endpoint);
            let mut names: HashSet<&str> = HashSet::new();
            for request in &endpoint.requests {
                if !names.insert(request.name.as_str()) {
                    return Err(format!(
                        "эндпоинт {} {}: два набора с именем {:?}",
                        endpoint.method, endpoint.path, request.name
                    ));
                }
                resolve_values(&target, request)?;
            }
        }
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::repository::sqlite::test_db;
    use sqlx::Executor;

    /// Документ с содержимым из файла — то же состояние, в котором его
    /// оставляет обычный импорт.
    async fn doc_with(groups: serde_json::Value) -> SqlitePool {
        let pool = test_db::migrated().await;
        pool.execute(sqlx::raw_sql(
            r#"
            INSERT INTO platforms (id,name) VALUES ('p1','P');
            INSERT INTO catalog_node (id,platform_id,kind,name) VALUES ('d1','p1','doc_api','D');
            INSERT INTO doc_api (id,prefix) VALUES ('d1','/v1');
            "#,
        ))
        .await
        .unwrap();

        GroupRepo::new(&pool)
            .create("d1", &parse(groups))
            .await
            .unwrap();

        pool
    }

    fn parse(groups: serde_json::Value) -> Vec<CreateGroupDTO> {
        serde_json::from_value(groups).expect("файл не разбирается")
    }

    fn file(groups: serde_json::Value) -> SyncDocApiDTO {
        SyncDocApiDTO {
            doc_id: "d1".to_string(),
            prefix: None,
            groups: parse(groups),
        }
    }

    async fn count(pool: &SqlitePool, what: &str) -> i64 {
        sqlx::query_scalar(&format!("SELECT COUNT(*) FROM {what}"))
            .fetch_one(pool)
            .await
            .unwrap()
    }

    fn ping() -> serde_json::Value {
        serde_json::json!([{
            "label": "Core",
            "endpoints": [{
                "method": "GET", "path": "/ping", "name": "Ping",
                "description": "Проверка живости", "queryParams": [
                    { "name": "verbose", "type": "boolean", "required": false, "desc": "" }
                ],
            }],
        }])
    }

    /// Тот же файл, залитый второй раз, ничего не задваивает: и группа, и
    /// эндпоинт опознаются по своим ключам и правятся на месте.
    #[tokio::test]
    async fn the_same_file_twice_leaves_one_copy_of_everything() {
        let pool = doc_with(ping()).await;

        let report = sync(&pool, file(ping())).await.unwrap();

        assert_eq!(report.groups_added, 0);
        assert_eq!(report.endpoints_added, 0);
        assert_eq!(report.endpoints_updated, 1);
        assert_eq!(count(&pool, r#""group""#).await, 1);
        assert_eq!(count(&pool, "endpoint").await, 1);
    }

    /// Дописанный в файл эндпоинт — это то, ради чего всё и делается:
    /// он появляется, а соседний остаётся на месте со своим id.
    #[tokio::test]
    async fn an_endpoint_added_to_the_file_shows_up_next_to_the_untouched_one() {
        let pool = doc_with(ping()).await;
        let before: String = sqlx::query_scalar("SELECT id FROM endpoint WHERE path = '/ping'")
            .fetch_one(&pool)
            .await
            .unwrap();

        let mut groups = ping();
        groups[0]["endpoints"]
            .as_array_mut()
            .unwrap()
            .push(serde_json::json!({
                "method": "POST", "path": "/ping", "name": "Ping back", "description": "",
            }));
        groups.as_array_mut().unwrap().push(serde_json::json!({
            "label": "Admin",
            "endpoints": [{ "method": "GET", "path": "/admin/stats", "name": "Stats" }],
        }));

        let report = sync(&pool, file(groups)).await.unwrap();

        assert_eq!(report.groups_added, 1);
        assert_eq!(report.endpoints_added, 2);
        assert_eq!(report.endpoints_updated, 1);

        let after: String =
            sqlx::query_scalar("SELECT id FROM endpoint WHERE path = '/ping' AND method = 'GET'")
                .fetch_one(&pool)
                .await
                .unwrap();
        assert_eq!(
            after, before,
            "существующий эндпоинт правится, а не заводится заново"
        );

        // Новая группа встаёт в конец списка, а не на место первой.
        let order: Vec<(String, i64)> =
            sqlx::query_as(r#"SELECT label, sort_ord FROM "group" ORDER BY sort_ord"#)
                .fetch_all(&pool)
                .await
                .unwrap();
        assert_eq!(order, vec![("Core".into(), 0), ("Admin".into(), 1)]);
    }

    /// Рядом с описанием лежит то, чего в файле не бывает: значение параметра
    /// и набор «Try it», заведённый руками. Импорт описания их не трогает —
    /// иначе после каждого обновления файла панель приходилось бы настраивать
    /// заново.
    #[tokio::test]
    async fn what_the_user_set_up_in_the_panel_survives_the_sync() {
        let pool = doc_with(ping()).await;
        let endpoint_id: String =
            sqlx::query_scalar("SELECT id FROM endpoint WHERE path = '/ping'")
                .fetch_one(&pool)
                .await
                .unwrap();

        sqlx::query(
            "UPDATE param SET value = '{{VERBOSE}}' WHERE endpoint_id = ? AND name = 'verbose'",
        )
        .bind(&endpoint_id)
        .execute(&pool)
        .await
        .unwrap();
        EndpointRequestRepo::new(&pool)
            .create(&endpoint_id, "Мой набор")
            .await
            .unwrap();

        sync(&pool, file(ping())).await.unwrap();

        let value: String = sqlx::query_scalar(
            "SELECT value FROM param WHERE endpoint_id = ? AND name = 'verbose'",
        )
        .bind(&endpoint_id)
        .fetch_one(&pool)
        .await
        .unwrap();
        assert_eq!(
            value, "{{VERBOSE}}",
            "привязка параметра к переменной пережила импорт"
        );

        let names: Vec<String> =
            sqlx::query_scalar("SELECT name FROM endpoint_requests WHERE endpoint_id = ?")
                .bind(&endpoint_id)
                .fetch_all(&pool)
                .await
                .unwrap();
        assert_eq!(
            names,
            ["Мой набор"],
            "набор, которого нет в файле, остаётся"
        );
    }

    /// Набор из файла ложится на свой одноимённый, а не встаёт рядом вторым.
    #[tokio::test]
    async fn a_request_from_the_file_overwrites_the_one_with_the_same_name() {
        let with_request = |body: &str| {
            serde_json::json!([{
                "label": "Core",
                "endpoints": [{
                    "method": "POST", "path": "/echo", "name": "Echo",
                    "requests": [{ "name": "Smoke", "body": { "text": body } }],
                }],
            }])
        };

        let pool = doc_with(with_request("было")).await;
        sync(&pool, file(with_request("стало"))).await.unwrap();

        let bodies: Vec<String> = sqlx::query_scalar("SELECT body FROM endpoint_requests")
            .fetch_all(&pool)
            .await
            .unwrap();
        assert_eq!(bodies.len(), 1, "набор с тем же именем не задваивается");
        assert!(
            bodies[0].contains("стало"),
            "тело набора приехало из файла: {}",
            bodies[0]
        );
    }

    /// Файл, где один эндпоинт описан дважды, не применяется вовсе: какое из
    /// двух описаний настоящее — вопрос к автору файла, а не к импорту.
    #[tokio::test]
    async fn a_file_that_describes_one_endpoint_twice_is_rejected_before_any_write() {
        let pool = doc_with(ping()).await;

        let mut groups = ping();
        groups.as_array_mut().unwrap().push(serde_json::json!({
            "label": "Admin",
            "endpoints": [{ "method": "GET", "path": "/ping", "name": "Ping again" }],
        }));

        let err = sync(&pool, file(groups)).await.unwrap_err();

        assert!(err.contains("/ping"), "невнятная подсказка: {err}");
        assert_eq!(
            count(&pool, r#""group""#).await,
            1,
            "до записи дело не дошло"
        );
    }

    /// Эндпоинт, переложенный в файле в другую группу, переезжает следом.
    #[tokio::test]
    async fn an_endpoint_moved_between_groups_in_the_file_moves_in_the_document() {
        let pool = doc_with(ping()).await;

        let moved = serde_json::json!([{
            "label": "Health",
            "endpoints": [{ "method": "GET", "path": "/ping", "name": "Ping" }],
        }]);
        sync(&pool, file(moved)).await.unwrap();

        let label: String = sqlx::query_scalar(
            r#"SELECT g.label FROM endpoint e JOIN "group" g ON g.id = e.group_id"#,
        )
        .fetch_one(&pool)
        .await
        .unwrap();
        assert_eq!(label, "Health");
        assert_eq!(count(&pool, "endpoint").await, 1);
    }

    /// Документа нет — импорту некуда писать, и молчать об этом нельзя.
    #[tokio::test]
    async fn syncing_into_a_missing_document_says_so() {
        let pool = test_db::migrated().await;

        let err = sync(&pool, file(ping())).await.unwrap_err();

        assert!(err.contains("документ"), "невнятная подсказка: {err}");
    }
}
