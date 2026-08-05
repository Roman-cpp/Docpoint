use crate::domain::domain::entity::Domain;
use crate::domain::domain::repository::DomainRepository;
use crate::repository::sqlite::domain::DomainRepo;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn read_platform_domains(
    state: State<'_, AppState>,
    platform_id: String,
) -> Result<Vec<Domain>, String> {
    DomainRepo::new(&state.db).by_platform(&platform_id).await
}
