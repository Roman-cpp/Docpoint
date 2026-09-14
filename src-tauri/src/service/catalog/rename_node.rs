use crate::domain::catalog::dto::RenameNodeDTO;
use crate::domain::catalog::repository::CatalogRepository;
use crate::repository::sqlite::catalog::CatalogRepo;
use crate::state::AppState;

/// Переименовать узел любого вида и заодно поправить описание — имя документа
/// живёт в дереве, поэтому путь один для каталога, doc-api, doc-ws, ERD и md.
pub async fn rename_node(state: &AppState, node: RenameNodeDTO) -> Result<(), String> {
    CatalogRepo::new(&state.db).rename(&node).await
}
