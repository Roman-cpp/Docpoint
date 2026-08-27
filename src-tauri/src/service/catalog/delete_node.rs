use crate::domain::catalog::repository::CatalogRepository;
use crate::domain::content::repository::ContentRepository;
use crate::repository::filesystem::content::ContentRepo;
use crate::repository::sqlite::catalog::CatalogRepo;
use crate::state::AppState;
use tauri::State;

/// Удалить узел вместе с поддеревом. Тела документов удаляются до строк: после
/// каскада по `parent_id` искать их было бы уже не по чему.
#[tauri::command]
pub async fn delete_node(state: State<'_, AppState>, id: String) -> Result<(), String> {
    let catalog = CatalogRepo::new(&state.db);
    let content = ContentRepo::new(&state.content_dir);

    for node in catalog.subtree(&id).await? {
        if node.kind.has_content() {
            content.delete(&node.id).await?;
        }
    }

    catalog.delete(&id).await
}
