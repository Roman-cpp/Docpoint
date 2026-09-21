use crate::domain::db_import::connection::dto::DbConnectionDTO;
use crate::domain::doc_erd::compare::diff;
use crate::domain::doc_erd::compare::entity::ErdDiff;
use crate::domain::doc_erd::entity::repository::EntityRepository;
use crate::domain::doc_erd::entity_relation::repository::RelationRepository;
use crate::repository::sqlite::entity::EntityRepo;
use crate::repository::sqlite::entity_relation::RelationRepo;
use crate::state::AppState;

/// Сравнение диаграммы с живой базой.
///
/// Читается только системный каталог — ни одной строки пользовательских
/// данных, тем же путём, что и предпросмотр импорта. Реквизиты приходят с
/// вызовом и нигде не сохраняются: сравнение ничего не меняет ни в базе, ни в
/// документе, и списка подключений у него нет.
pub async fn compare_erd_with_db(
    state: &AppState,
    doc_erd_id: String,
    conn: DbConnectionDTO,
    schema: Option<String>,
) -> Result<ErdDiff, String> {
    let entities = EntityRepo::new(&state.db).all_by_erd(&doc_erd_id).await?;
    let relations = RelationRepo::new(&state.db).by_erd(&doc_erd_id).await?;
    let db = crate::service::db_introspect(conn, schema).await?;

    Ok(diff::compare(&entities, &relations, db))
}
