use crate::domain::environment::model::CreateEnvironmentDTO;
use crate::domain::environment::repository::{EnvironmentRepo, EnvironmentRepository};
use crate::domain::platform::model::{CreatePlatformDTO, Platform};
use crate::domain::platform::repository::{PlatformRepo, PlatformRepository};
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
        .create(&created_platform.id, "platform", &environment)
        .await?;

      print!("created_environment");
      println!("{:?}", a);


    Ok(created_platform)
}
