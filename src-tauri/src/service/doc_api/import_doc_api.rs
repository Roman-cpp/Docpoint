use crate::domain::catalog::dto::CreateNodeDTO;
use crate::domain::doc_api::group::dto::CreateGroupDTO;
use crate::domain::doc_api::group::repository::GroupRepository;
use crate::repository::sqlite::group::GroupRepo;
use crate::service::catalog::create_tree_node;
use crate::state::AppState;
use tauri::State;

/// Импорт doc-api из файла: тот же путь создания, что и у ручного, плюс группы
/// с эндпоинтами из файла. Место в дереве задаёт вызывающая сторона — импорт
/// кладёт документ туда, где открыт проводник.
#[tauri::command]
pub async fn import_doc(
    state: State<'_, AppState>,
    node: CreateNodeDTO,
    groups: Vec<CreateGroupDTO>,
) -> Result<String, String> {
    let created = create_tree_node(&state, &node).await?;

    GroupRepo::new(&state.db).create(&created.id, &groups).await?;

    Ok(created.id)
}
