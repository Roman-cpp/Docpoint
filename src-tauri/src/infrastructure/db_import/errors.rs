//! Отказы внешней базы человеческим текстом.
//!
//! Сообщение уходит прямо в тост, поэтому важны две вещи: назвать причину так,
//! чтобы её можно было исправить («выберите режим require»), и ни при каких
//! обстоятельствах не пересказывать строку подключения — в ней пароль.

use crate::domain::db_import::connection::dto::{DbConnectionDTO, DbKind};

pub fn explain(conn: &DbConnectionDTO, err: &sqlx::Error) -> String {
    let host = conn.host_or_default();
    let port = conn.port_or_default();
    let user = conn.user.as_deref().unwrap_or("");
    let database = conn.database.as_deref().unwrap_or("");
    let file = conn.file.as_deref().unwrap_or("");

    match err {
        sqlx::Error::Io(_) => match conn.kind {
            DbKind::Sqlite => format!("Не удалось открыть файл базы: {file}"),
            _ => {
                format!("Не удалось подключиться к {host}:{port} — хост недоступен или порт закрыт")
            }
        },
        sqlx::Error::Tls(e) => {
            let text = e.to_string();
            if text.contains("does not support TLS") || text.contains("not support") {
                "Сервер не поддерживает TLS — выберите режим «prefer» или «disable»".to_string()
            } else {
                "Сертификат сервера не прошёл проверку — для внутреннего сертификата выберите режим «require»".to_string()
            }
        }
        sqlx::Error::Database(db) => {
            let code = db.code().unwrap_or_default().to_string();
            match code.as_str() {
                // PostgreSQL: invalid_password / invalid_authorization
                "28P01" | "28000" => "Неверный логин или пароль".to_string(),
                // PostgreSQL: invalid_catalog_name
                "3D000" => format!("База данных «{database}» не найдена"),
                // PostgreSQL: invalid_schema_name
                "3F000" => format!(
                    "Схема «{}» не найдена",
                    conn.schema.as_deref().unwrap_or("")
                ),
                // PostgreSQL: insufficient_privilege
                "42501" => {
                    format!("У пользователя «{user}» нет прав на чтение системного каталога")
                }
                // MySQL
                "1045" => "Неверный логин или пароль".to_string(),
                "1049" => format!("База данных «{database}» не найдена"),
                "1142" | "1143" => {
                    format!("У пользователя «{user}» нет прав на чтение системного каталога")
                }
                // SQLite (расширенные коды приходят строкой)
                "14" => format!("Файл базы не найден или недоступен на чтение: {file}"),
                "26" => format!("Файл не похож на базу SQLite: {file}"),
                "5" => "База занята другим процессом — закройте программу, которая с ней работает"
                    .to_string(),
                _ => format!("Ошибка базы: {}", db.message()),
            }
        }
        sqlx::Error::PoolTimedOut => {
            format!("Превышено время ожидания подключения к {host}:{port}")
        }
        // Общий хвост: текст sqlx, но без строки подключения — её здесь нет.
        other => format!("Ошибка чтения схемы: {other}"),
    }
}
