use crate::domain::environment::environment::dto::UpdateEnvironmentDTO;
use crate::domain::environment::environment::repository::EnvironmentRepository;
use crate::repository::sqlite::environment::EnvironmentRepo;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn update_environment(
    state: State<'_, AppState>,
    environment: UpdateEnvironmentDTO,
) -> Result<(), String> {
    crate::logging::logged(
        "update_environment",
        async { EnvironmentRepo::new(&state.db).update(&environment).await }.await,
    )
}
