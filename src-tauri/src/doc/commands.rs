use crate::state::AppState;
use super::model::{CreateDoc, Doca};
use super::repository::{DocRepo, DocRepository};
use tauri::State;

#[tauri::command]
pub async fn read_docs(state: State<'_, AppState>) -> Result<Vec<Doca>, String> {
    DocRepo::new(&state.db).all().await
}

#[tauri::command]
pub async fn read_doc(
    state: State<'_, AppState>,
    id: String,
) -> Result<Option<Doca>, String> {
    DocRepo::new(&state.db).find(&id).await
}

#[tauri::command]
pub async fn create_doc(
    state: State<'_, AppState>,
    doc: CreateDoc,
) -> Result<String, String> {
    DocRepo::new(&state.db).create(&doc).await
}

#[tauri::command]
pub async fn delete_doc(
    state: State<'_, AppState>,
    id: String,
) -> Result<(), String> {
    DocRepo::new(&state.db).delete(&id).await
}
