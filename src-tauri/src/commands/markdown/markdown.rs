use crate::domain::content::entity::MarkdownDoc;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn read_markdown(
    state: State<'_, AppState>,
    id: String,
) -> Result<Option<MarkdownDoc>, String> {
    crate::logging::logged(
        "read_markdown",
        crate::service::read_markdown(&state, id).await,
    )
}

#[tauri::command]
pub async fn update_markdown(
    state: State<'_, AppState>,
    id: String,
    content: String,
) -> Result<(), String> {
    crate::logging::logged(
        "update_markdown",
        crate::service::update_markdown(&state, id, content).await,
    )
}
