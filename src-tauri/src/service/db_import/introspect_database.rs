use crate::domain::db_import::connection::dto::DbConnectionDTO;
use crate::domain::db_import::schema::dto::DbIntrospectDTO;
use crate::infrastructure::db_import;
use crate::infrastructure::db_import::normalize;

/// Снимок схемы внешней базы в форме, которую примет `import_erd`.
///
/// Читается только системный каталог — ни одной строки пользовательских
/// таблиц. Всё, что холст нарисовать не может (самоссылки, дубли пары колонок,
/// ссылки за пределы схемы), отсеивается здесь же и объясняется в `notices`:
/// боевая схема дана как есть, отказывать ей в импорте не за что, а терять
/// связи молча нельзя.
#[tauri::command]
pub async fn db_introspect(
    conn: DbConnectionDTO,
    schema: Option<String>,
) -> Result<DbIntrospectDTO, String> {
    crate::logging::logged(
        "db_introspect",
        async {
            let name = schema
                .or_else(|| conn.schema.clone())
                .or_else(|| conn.database.clone())
                .unwrap_or_else(|| "main".to_string());

            let mut source = db_import::connect(&conn).await?;
            let result = source.introspect(&name).await;
            db_import::close(source).await;

            Ok(normalize::to_erd(&result?))
        }
        .await,
    )
}
