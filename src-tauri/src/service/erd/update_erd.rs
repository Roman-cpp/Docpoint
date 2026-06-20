use crate::domain::doc_erd::doc_erd::dto::UpdateDocErdDTO;
use crate::domain::doc_erd::doc_erd::repository::DocErdRepository;
use crate::repository::sqlite::doc_erd::DocErdRepo;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn update_erd(
    state: State<'_, AppState>,
    erd: UpdateDocErdDTO,
) -> Result<(), String> {
    DocErdRepo::new(&state.db).update(&erd).await
}
