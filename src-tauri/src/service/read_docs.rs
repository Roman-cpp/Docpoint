use crate::domain::doc::model::Doca;
use crate::domain::doc::repository::{DocRepo, DocRepository};
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn read_docs(state: State<'_, AppState>) -> Result<Vec<Doca>, String> {
    DocRepo::new(&state.db).all().await
}
