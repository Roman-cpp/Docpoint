use crate::domain::service::repository::ServiceRepository;
use crate::repository::sqlite::service::ServiceRepo;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn attach_doc(
    state: State<'_, AppState>,
    service_id: String,
    doc_id: String,
) -> Result<(), String> {
    ServiceRepo::new(&state.db)
        .attach_doc(&service_id, &doc_id)
        .await
}
