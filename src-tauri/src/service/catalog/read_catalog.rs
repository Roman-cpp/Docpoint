use crate::domain::catalog::entity::CatalogNode;
use crate::domain::catalog::repository::CatalogRepository;
use crate::repository::sqlite::catalog::CatalogRepo;
use crate::state::AppState;
use tauri::State;

/// Все узлы платформы одним списком. Дерево собирает фронтенд: узлов на
/// платформу немного, а один запрос избавляет проводник от догрузки на каждый
/// раскрытый каталог.
#[tauri::command]
pub async fn read_catalog_tree(
    state: State<'_, AppState>,
    platform_id: String,
) -> Result<Vec<CatalogNode>, String> {
    crate::logging::logged(
        "read_catalog_tree",
        async { CatalogRepo::new(&state.db).tree(&platform_id).await }.await,
    )
}

/// Один узел — страница документа знает только свой id, а показать нужно имя и
/// место в дереве.
#[tauri::command]
pub async fn read_node(
    state: State<'_, AppState>,
    id: String,
) -> Result<Option<CatalogNode>, String> {
    crate::logging::logged(
        "read_node",
        async { CatalogRepo::new(&state.db).find(&id).await }.await,
    )
}
