use crate::domain::doc_erd::model::UpdateDocErdDTO;
use crate::domain::doc_erd::repository::{DocErdRepo, DocErdRepository};
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn update_erd(
    state: State<'_, AppState>,
    erd: UpdateDocErdDTO,
) -> Result<(), String> {
    DocErdRepo::new(&state.db).update(&erd).await
}
