use crate::domain::db_import::connection::dto::DbConnectionDTO;
use crate::domain::db_import::schema::dto::DbIntrospectDTO;

#[tauri::command]
pub async fn db_introspect(
    conn: DbConnectionDTO,
    schema: Option<String>,
) -> Result<DbIntrospectDTO, String> {
    crate::logging::logged(
        "db_introspect",
        crate::service::db_introspect(conn, schema).await,
    )
}
