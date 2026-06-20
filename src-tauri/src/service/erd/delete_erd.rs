use crate::domain::doc_erd::doc_erd::repository::DocErdRepository;
use crate::repository::sqlite::doc_erd::DocErdRepo;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn delete_erd(
    state: State<'_, AppState>,
    erd_id: String,
) -> Result<(), String> {
    DocErdRepo::new(&state.db).delete(&erd_id).await
}
