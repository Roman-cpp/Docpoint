use crate::domain::catalog::repository::CatalogRepository;
use crate::domain::content::repository::ContentRepository;
use crate::domain::environment::environment::repository::EnvironmentRepository;
use crate::domain::platform::repository::PlatformRepository;
use crate::repository::filesystem::content::ContentRepo;
use crate::repository::sqlite::catalog::CatalogRepo;
use crate::repository::sqlite::environment::EnvironmentRepo;
use crate::repository::sqlite::platform::PlatformRepo;
use crate::state::AppState;

/// Удалить платформу с её окружениями и всем деревом. Строки дерева уносит
/// каскад `catalog_node.platform_id`, а тела документов лежат файлами — их
/// нужно убрать до того, как узлы исчезнут.
pub async fn delete_platform(state: &AppState, id: String) -> Result<(), String> {
    let platforms = PlatformRepo::new(&state.db);

    let Some(platform) = platforms.find_by_id(&id).await? else {
        return Ok(());
    };

    let content = ContentRepo::new(&state.content_dir);
    for node in CatalogRepo::new(&state.db).tree(&platform.id).await? {
        if node.kind.has_content() {
            content.delete(&node.id).await?;
        }
    }

    platforms.delete(&platform.id).await?;
    EnvironmentRepo::new(&state.db).delete(&platform.id).await
}
