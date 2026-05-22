use crate::domain::doc::model::Doca;
use crate::domain::doc::repository::{DocRepo, DocRepository};
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn read_doc(
    state: State<'_, AppState>,
    id: String,
) -> Result<Option<Doca>, String> {
    DocRepo::new(&state.db).find(&id).await
}
