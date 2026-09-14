use serde::Deserialize;

/// Вид внешней базы. Значение выбирает адаптер — по одному на диалект, потому
/// что общего SQL для чтения каталога у них нет. Сюда же встанет `Mongo`,
/// когда дойдёт очередь до схемы, выведенной из документов.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum DbKind {
    Postgres,
    Mysql,
    Sqlite,
}

/// Реквизиты подключения к внешней базе.
///
/// Приходят с каждым вызовом и нигде не сохраняются: у импорта нет ни списка
/// подключений, ни хранилища паролей. Поля необязательные, потому что набор
/// нужных зависит от вида: у SQLite это только `file`, у остальных — хост с
/// учётными данными.
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DbConnectionDTO {
    pub kind: DbKind,
    pub host: Option<String>,
    pub port: Option<u16>,
    pub user: Option<String>,
    pub password: Option<String>,
    /// PostgreSQL — имя базы, MySQL — имя базы же (оно и есть схема).
    pub database: Option<String>,
    /// PostgreSQL — пространство имён внутри базы; по умолчанию `public`.
    pub schema: Option<String>,
    /// SQLite — путь к файлу базы.
    pub file: Option<String>,
    /// `disable` | `prefer` | `require` | `verify-full`; по умолчанию `prefer`.
    pub ssl: Option<String>,
}

impl DbConnectionDTO {
    pub fn host_or_default(&self) -> &str {
        self.host.as_deref().unwrap_or("localhost")
    }

    pub fn port_or_default(&self) -> u16 {
        self.port.unwrap_or(match self.kind {
            DbKind::Postgres => 5432,
            DbKind::Mysql => 3306,
            DbKind::Sqlite => 0,
        })
    }
}
