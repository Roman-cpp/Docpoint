use crate::domain::doc_erd::doc_erd::dto::CreateDocErdDTO;
use crate::domain::doc_erd::doc_erd::repository::DocErdRepository;
use crate::repository::sqlite::doc_erd::DocErdRepo;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn create_erd(
    state: State<'_, AppState>,
    erd: CreateDocErdDTO,
) -> Result<String, String> {
    DocErdRepo::new(&state.db).create(&erd).await
}
