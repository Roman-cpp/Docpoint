use crate::domain::db_import::connection::dto::DbConnectionDTO;
use crate::infrastructure::db_import;

/// Схемы PostgreSQL или базы MySQL, видимые под этими реквизитами.
///
/// Соединение живёт только внутри вызова: подключений мастер не хранит, и
/// пароль нигде не оседает. У SQLite схема одна (`main`), и мастер этот шаг
/// пропускает.
#[tauri::command]
pub async fn db_list_schemas(conn: DbConnectionDTO) -> Result<Vec<String>, String> {
    crate::logging::logged("db_list_schemas", async {
        let mut source = db_import::connect(&conn).await?;
        let result = source.schemas().await;
        db_import::close(source).await;
        result
    }
    .await)
}
