use crate::domain::catalog::entity::NodeKind;
use crate::domain::catalog::repository::CatalogRepository;
use crate::domain::content::entity::MarkdownDoc;
use crate::domain::content::repository::ContentRepository;
use crate::repository::filesystem::content::ContentRepo;
use crate::repository::sqlite::catalog::CatalogRepo;
use crate::state::AppState;
use tauri::State;

/// Markdown-документ с телом. `None` — узла нет или это не markdown: страница
/// просмотра должна показать «документ не найден», а не пустой текст.
#[tauri::command]
pub async fn read_markdown(
    state: State<'_, AppState>,
    id: String,
) -> Result<Option<MarkdownDoc>, String> {
    let Some(node) = CatalogRepo::new(&state.db).find(&id).await? else {
        return Ok(None);
    };

    if node.kind != NodeKind::Markdown {
        return Ok(None);
    }

    let content = ContentRepo::new(&state.content_dir).read(&node.id).await?;

    Ok(Some(MarkdownDoc {
        id: node.id,
        name: node.name,
        content,
        updated_at: node.updated_at,
    }))
}

/// Перезаписать тело markdown-документа.
#[tauri::command]
pub async fn update_markdown(
    state: State<'_, AppState>,
    id: String,
    content: String,
) -> Result<(), String> {
    ContentRepo::new(&state.content_dir)
        .write(&id, &content)
        .await?;

    CatalogRepo::new(&state.db).touch(&id).await
}
