use crate::domain::service::repository::ServiceRepository;
use crate::repository::sqlite::service::ServiceRepo;
use crate::state::AppState;
use tauri::State;

/// Delete a microservice by its id.
#[tauri::command]
pub async fn delete_service(state: State<'_, AppState>, id: String) -> Result<(), String> {
    ServiceRepo::new(&state.db).delete(&id).await
}
