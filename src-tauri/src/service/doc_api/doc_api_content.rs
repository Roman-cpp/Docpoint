use crate::domain::doc_api::doc_content::repository::DocContentRepository;
use crate::repository::filesystem::doc_content::DocContentRepo;
use crate::state::AppState;
use tauri::State;

/// Read the markdown body of a doc.
#[tauri::command]
pub async fn read_doc_content(state: State<'_, AppState>, id: String) -> Result<String, String> {
    DocContentRepo::new(&state.docs_dir).read(&id).await
}

/// Persist the markdown body of a doc.
#[tauri::command]
pub async fn write_doc_content(
    state: State<'_, AppState>,
    id: String,
    content: String,
) -> Result<(), String> {
    DocContentRepo::new(&state.docs_dir).write(&id, &content).await
}
