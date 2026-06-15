use crate::domain::doc::model::UpdateDocDTO;
use crate::domain::doc::repository::{DocRepo, DocRepository};
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn update_doc(
    state: State<'_, AppState>,
    doc: UpdateDocDTO,
) -> Result<String, String> {
    DocRepo::new(&state.db).update(&doc).await
}
