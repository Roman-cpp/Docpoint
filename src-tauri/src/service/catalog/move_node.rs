use crate::domain::catalog::dto::MoveNodeDTO;
use crate::domain::catalog::repository::CatalogRepository;
use crate::repository::sqlite::catalog::CatalogRepo;
use crate::state::AppState;
use tauri::State;

/// Перенести узел в другой каталог; `parentId: null` — в корень платформы.
/// Вместе с каталогом переезжает всё его поддерево.
#[tauri::command]
pub async fn move_node(state: State<'_, AppState>, node: MoveNodeDTO) -> Result<(), String> {
    crate::logging::logged(
        "move_node",
        async { CatalogRepo::new(&state.db).move_to(&node).await }.await,
    )
}
