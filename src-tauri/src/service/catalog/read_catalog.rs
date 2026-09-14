use crate::domain::catalog::entity::CatalogNode;
use crate::domain::catalog::repository::CatalogRepository;
use crate::repository::sqlite::catalog::CatalogRepo;
use crate::state::AppState;

/// Все узлы платформы одним списком. Дерево собирает фронтенд: узлов на
/// платформу немного, а один запрос избавляет проводник от догрузки на каждый
/// раскрытый каталог.
pub async fn read_catalog_tree(
    state: &AppState,
    platform_id: String,
) -> Result<Vec<CatalogNode>, String> {
    CatalogRepo::new(&state.db).tree(&platform_id).await
}

/// Один узел — страница документа знает только свой id, а показать нужно имя и
/// место в дереве.
pub async fn read_node(state: &AppState, id: String) -> Result<Option<CatalogNode>, String> {
    CatalogRepo::new(&state.db).find(&id).await
}
