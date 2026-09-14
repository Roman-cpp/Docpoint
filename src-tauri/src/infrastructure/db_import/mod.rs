//! Подключение к внешней базе и чтение её схемы.
//!
//! Соединение живёт ровно один вызов команды: реквизиты приходят с каждым
//! запросом и никуда не сохраняются, а шаг создания диаграммы к базе уже не
//! обращается — он повторяет payload, который фронтенд получил на предпросмотре.
//! Поэтому ни реестра соединений, ни их закрытия по таймауту здесь нет.

pub mod errors;
pub mod mysql;
pub mod normalize;
pub mod postgres;
pub mod render;
pub mod sqlite_file;

use std::time::Duration;

use sqlx::mysql::{MySqlConnectOptions, MySqlSslMode};
use sqlx::postgres::{PgConnectOptions, PgSslMode};
use sqlx::sqlite::SqliteConnectOptions;
use sqlx::{Connection, MySqlConnection, PgConnection, SqliteConnection};

use crate::domain::db_import::connection::dto::{DbConnectionDTO, DbKind};
use crate::domain::db_import::schema::entity::DbSchema;
use crate::domain::db_import::schema::repository::SchemaSource;

use self::errors::explain;
use self::mysql::MySource;
use self::postgres::PgSource;
use self::sqlite_file::LiteSource;

/// Неотвечающий хост не должен держать мастер в «Подключаемся…» бесконечно —
/// та же дисциплина, что у рукопожатия WebSocket.
const CONNECT_TIMEOUT: Duration = Duration::from_secs(10);
const QUERY_TIMEOUT: Duration = Duration::from_secs(30);

pub enum DbConn {
    Pg(PgConnection),
    My(MySqlConnection),
    Lite(SqliteConnection),
}

fn pg_ssl_mode(raw: Option<&str>) -> PgSslMode {
    match raw.unwrap_or("prefer") {
        "disable" => PgSslMode::Disable,
        "require" => PgSslMode::Require,
        "verify-ca" => PgSslMode::VerifyCa,
        "verify-full" => PgSslMode::VerifyFull,
        _ => PgSslMode::Prefer,
    }
}

fn mysql_ssl_mode(raw: Option<&str>) -> MySqlSslMode {
    match raw.unwrap_or("prefer") {
        "disable" => MySqlSslMode::Disabled,
        "require" => MySqlSslMode::Required,
        "verify-ca" => MySqlSslMode::VerifyCa,
        "verify-full" => MySqlSslMode::VerifyIdentity,
        _ => MySqlSslMode::Preferred,
    }
}

/// Подключение под общим ограничением по времени. Отдельной функцией, а не
/// замыканием: типы соединений разные, и замыкание застряло бы на первом.
async fn timeout<T>(
    fut: impl std::future::Future<Output = Result<T, sqlx::Error>>,
) -> Result<T, sqlx::Error> {
    tokio::time::timeout(CONNECT_TIMEOUT, fut)
        .await
        .unwrap_or(Err(sqlx::Error::PoolTimedOut))
}

pub async fn connect(dto: &DbConnectionDTO) -> Result<DbConn, String> {
    let conn = match dto.kind {
        DbKind::Postgres => {
            // `PgConnectOptions::new()` дочитывает PGHOST/PGPASSWORD и ~/.pgpass:
            // на машине разработчика подключение молча уехало бы не туда.
            let mut options = PgConnectOptions::new_without_pgpass()
                .host(dto.host_or_default())
                .port(dto.port_or_default())
                .ssl_mode(pg_ssl_mode(dto.ssl.as_deref()));
            if let Some(user) = &dto.user {
                options = options.username(user);
            }
            if let Some(password) = &dto.password {
                options = options.password(password);
            }
            if let Some(database) = &dto.database {
                options = options.database(database);
            }
            DbConn::Pg(
                timeout(PgConnection::connect_with(&options))
                    .await
                    .map_err(|e| explain(dto, &e))?,
            )
        }
        DbKind::Mysql => {
            let mut options = MySqlConnectOptions::new()
                .host(dto.host_or_default())
                .port(dto.port_or_default())
                .ssl_mode(mysql_ssl_mode(dto.ssl.as_deref()));
            if let Some(user) = &dto.user {
                options = options.username(user);
            }
            if let Some(password) = &dto.password {
                options = options.password(password);
            }
            if let Some(database) = &dto.database {
                options = options.database(database);
            }
            DbConn::My(
                timeout(MySqlConnection::connect_with(&options))
                    .await
                    .map_err(|e| explain(dto, &e))?,
            )
        }
        DbKind::Sqlite => {
            let path = dto
                .file
                .as_deref()
                .filter(|p| !p.trim().is_empty())
                .ok_or("Не указан файл базы SQLite")?;

            // Чужую базу открываем только на чтение и не создаём файл, если
            // пути не существует: опечатка в пути не должна заводить пустую БД.
            let options = SqliteConnectOptions::new()
                .filename(path)
                .read_only(true)
                .create_if_missing(false);

            let conn = match timeout(SqliteConnection::connect_with(&options)).await {
                Ok(conn) => conn,
                // База на носителе только для чтения не даёт создать -wal/-shm;
                // `immutable` — единственный способ её всё-таки прочитать.
                Err(_) => {
                    let immutable = SqliteConnectOptions::new()
                        .filename(path)
                        .read_only(true)
                        .create_if_missing(false)
                        .immutable(true);
                    timeout(SqliteConnection::connect_with(&immutable))
                        .await
                        .map_err(|e| explain(dto, &e))?
                }
            };
            DbConn::Lite(conn)
        }
    };

    Ok(conn)
}

/// Закрывает соединение, не заслоняя собой настоящую ошибку вызова: если
/// закрытие не удалось, сервер всё равно уберёт бэкенд по своему таймауту.
pub async fn close(conn: DbConn) {
    let _ = match conn {
        DbConn::Pg(c) => c.close().await,
        DbConn::My(c) => c.close().await,
        DbConn::Lite(c) => c.close().await,
    };
}

impl DbConn {
    pub async fn schemas(&mut self) -> Result<Vec<String>, String> {
        let work = async {
            match self {
                DbConn::Pg(c) => PgSource { conn: c }.schemas().await,
                DbConn::My(c) => MySource { conn: c }.schemas().await,
                DbConn::Lite(c) => LiteSource { conn: c }.schemas().await,
            }
        };
        bounded(work).await
    }

    pub async fn introspect(&mut self, schema: &str) -> Result<DbSchema, String> {
        let work = async {
            match self {
                DbConn::Pg(c) => PgSource { conn: c }.introspect(schema).await,
                DbConn::My(c) => MySource { conn: c }.introspect(schema).await,
                DbConn::Lite(c) => LiteSource { conn: c }.introspect(schema).await,
            }
        };
        bounded(work).await
    }
}

async fn bounded<T>(
    work: impl std::future::Future<Output = Result<T, String>>,
) -> Result<T, String> {
    tokio::time::timeout(QUERY_TIMEOUT, work)
        .await
        .unwrap_or_else(|_| Err("База не ответила за 30 секунд".to_string()))
}
