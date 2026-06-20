use crate::domain::environment::environment::dto::CreateEnvironmentDTO;
use crate::domain::environment::environment::repository::EnvironmentRepository;
use crate::repository::sqlite::environment::EnvironmentRepo;
use crate::domain::platform::dto::CreatePlatformDTO;
use crate::domain::platform::entity::Platform;
use crate::domain::platform::repository::PlatformRepository;
use crate::repository::sqlite::platform::PlatformRepo;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn create_platform(
    state: State<'_, AppState>,
    platform: CreatePlatformDTO,
) -> Result<Platform, String> {
    let created_platform = PlatformRepo::new(&state.db).create(&platform).await?;

    println!("created_platform");
    println!("{:?}", created_platform);

    let environment = CreateEnvironmentDTO {
        env: "local".to_string(),
        label: "Local".to_string(),
        base_url: "http://localhost/".to_string(),
        prefix: "".to_string()
    };

    println!("{:?}", environment);

    let a = EnvironmentRepo::new(&state.db)
        .create(&created_platform.id, &environment)
        .await?;

      print!("created_environment");
      println!("{:?}", a);


    Ok(created_platform)
}
