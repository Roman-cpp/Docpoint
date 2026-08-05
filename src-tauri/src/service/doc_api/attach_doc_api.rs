use crate::domain::domain::repository::DomainRepository;
use crate::repository::sqlite::domain::DomainRepo;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn attach_doc(
    state: State<'_, AppState>,
    domain_id: String,
    doc_id: String,
) -> Result<(), String> {
    DomainRepo::new(&state.db)
        .attach_doc(&domain_id, &doc_id)
        .await
}
