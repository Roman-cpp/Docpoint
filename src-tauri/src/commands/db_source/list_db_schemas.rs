use crate::domain::db_import::connection::dto::DbConnectionDTO;

#[tauri::command]
pub async fn db_list_schemas(conn: DbConnectionDTO) -> Result<Vec<String>, String> {
    crate::logging::logged(
        "db_list_schemas",
        crate::service::db_list_schemas(conn).await,
    )
}
