use crate::domain::environment::environment::dto::CreateEnvironmentDTO;
use crate::domain::environment::environment::repository::EnvironmentRepository;
use crate::domain::platform::dto::CreatePlatformDTO;
use crate::domain::platform::entity::Platform;
use crate::domain::platform::repository::PlatformRepository;
use crate::repository::sqlite::environment::EnvironmentRepo;
use crate::repository::sqlite::platform::PlatformRepo;
use crate::service::vault::provision::create_platform_dirs;
use crate::state::AppState;
use tauri::State;

/// Create a platform, its default `local` environment, and the vault directory
/// holding its files.
#[tauri::command]
pub async fn create_platform(
    state: State<'_, AppState>,
    platform: CreatePlatformDTO,
) -> Result<Platform, String> {
    let created = PlatformRepo::new(&state.db).create(&platform).await?;

    create_platform_dirs(&state.vault_dir, &created.id).await?;

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
