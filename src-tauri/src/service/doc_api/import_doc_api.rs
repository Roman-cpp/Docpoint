use crate::domain::doc_api::doc_api::dto::CreateDocApiDTO;
use crate::domain::doc_api::doc_api::repository::DocRepository;
use crate::repository::sqlite::doc_api::DocRepo;
use crate::domain::doc_api::group::dto::CreateGroupDTO;
use crate::domain::doc_api::group::repository::GroupRepository;
use crate::repository::sqlite::group::GroupRepo;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn import_doc(
    state: State<'_, AppState>,
    doc: CreateDocApiDTO,
    groups: Vec<CreateGroupDTO>,
) -> Result<String, String> {
    let db = &state.db;
    let doc_id = DocRepo::new(db).create(&doc).await?;
    GroupRepo::new(db).create(&doc_id, &groups).await?;
    Ok(doc_id)
}
