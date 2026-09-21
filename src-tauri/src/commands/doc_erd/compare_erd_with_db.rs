use crate::domain::db_import::connection::dto::DbConnectionDTO;
use crate::domain::doc_erd::compare::entity::ErdDiff;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn compare_erd_with_db(
    state: State<'_, AppState>,
    doc_erd_id: String,
    conn: DbConnectionDTO,
    schema: Option<String>,
) -> Result<ErdDiff, String> {
    crate::logging::logged(
        "compare_erd_with_db",
        crate::service::compare_erd_with_db(&state, doc_erd_id, conn, schema).await,
    )
}
