use crate::domain::environment::environment::repository::EnvironmentRepository;
use crate::domain::platform::repository::PlatformRepository;
use crate::repository::sqlite::environment::EnvironmentRepo;
use crate::repository::sqlite::platform::PlatformRepo;
use crate::service::vault::provision::delete_platform_dirs;
use crate::state::AppState;
use tauri::State;

/// Delete a platform with its environments and its whole file subtree — its own
/// files and every service under it, mirroring the `ON DELETE CASCADE` from
/// `platforms` to `services`.
#[tauri::command]
pub async fn delete_platform(state: State<'_, AppState>, id: String) -> Result<(), String> {
    let repo = PlatformRepo::new(&state.db);

    let Some(platform) = repo.find_by_id(&id).await? else {
        return Ok(());
    };

    // Files first: a failure here leaves the platform intact rather than
    // stranding a directory no entity points at any more.
    delete_platform_dirs(&state.vault_dir, &platform.id).await?;

    repo.delete(&id).await?;
    EnvironmentRepo::new(&state.db).delete(&platform.id).await
}
