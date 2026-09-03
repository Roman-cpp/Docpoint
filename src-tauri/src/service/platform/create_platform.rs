use crate::domain::environment::environment::dto::CreateEnvironmentDTO;
use crate::domain::environment::environment::repository::EnvironmentRepository;
use crate::domain::platform::dto::CreatePlatformDTO;
use crate::domain::platform::entity::Platform;
use crate::domain::platform::repository::PlatformRepository;
use crate::repository::sqlite::environment::EnvironmentRepo;
use crate::repository::sqlite::platform::PlatformRepo;
use crate::state::AppState;
use tauri::State;

/// Создать платформу и её окружение по умолчанию. Дерево каталогов у новой
/// платформы пустое — узлы заводит пользователь.
#[tauri::command]
pub async fn create_platform(
    state: State<'_, AppState>,
    platform: CreatePlatformDTO,
) -> Result<Platform, String> {
    crate::logging::logged("create_platform", async {
        let created = PlatformRepo::new(&state.db).create(&platform).await?;

        let environment = CreateEnvironmentDTO {
            env: "local".to_string(),
            label: "Local".to_string(),
            base_url: "http://localhost/".to_string(),
            prefix: "".to_string(),
        };

        EnvironmentRepo::new(&state.db)
            .create(&created.id, &environment)
            .await?;

        Ok(created)
    }
    .await)
}
