use crate::domain::catalog::dto::MoveNodeDTO;
use crate::domain::catalog::repository::CatalogRepository;
use crate::repository::sqlite::catalog::CatalogRepo;
use crate::state::AppState;

/// Перенести узел в другой каталог; `parentId: null` — в корень платформы.
/// Вместе с каталогом переезжает всё его поддерево.
pub async fn move_node(state: &AppState, node: MoveNodeDTO) -> Result<(), String> {
    CatalogRepo::new(&state.db).move_to(&node).await
}
