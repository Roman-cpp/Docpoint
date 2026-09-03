use crate::domain::catalog::repository::CatalogRepository;
use crate::domain::content::repository::ContentRepository;
use crate::repository::filesystem::content::ContentRepo;
use crate::repository::sqlite::catalog::CatalogRepo;
use crate::state::AppState;
use tauri::State;

/// Обзорная часть doc-api — markdown-тело документа.
#[tauri::command]
pub async fn read_doc_content(state: State<'_, AppState>, id: String) -> Result<String, String> {
    crate::logging::logged("read_doc_content", async {
        ContentRepo::new(&state.content_dir).read(&id).await
    }
    .await)
}

#[tauri::command]
pub async fn write_doc_content(
    state: State<'_, AppState>,
    id: String,
    content: String,
) -> Result<(), String> {
    crate::logging::logged("write_doc_content", async {
        ContentRepo::new(&state.content_dir)
            .write(&id, &content)
            .await?;

        CatalogRepo::new(&state.db).touch(&id).await
    }
    .await)
}
