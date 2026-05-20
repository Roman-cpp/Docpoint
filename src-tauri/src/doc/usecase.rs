use crate::doc::model::CreateDoc;
use crate::doc::repository::{DocRepo, DocRepository};
use crate::entity::model::CreateEntity;
use crate::entity::repository::{EntityRepo, EntityRepository};
use crate::environment::model::CreateEnvironment;
use crate::environment::repository;
use crate::group::model::CreateGroup;
use crate::group::repository::{GroupRepo, GroupRepository};
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn import_doc(
    state: State<'_, AppState>,
    doc: CreateDoc,
    groups: Vec<CreateGroup>,
    entities: Vec<CreateEntity>,
    environments: Vec<CreateEnvironment>,
) -> Result<String, String> {
    let db = &state.db;
    let doc_id = DocRepo::new(db).create(&doc).await?;
    GroupRepo::new(db).create(&doc_id, &groups).await?;
    EntityRepo::new(db).create(&doc_id, &entities).await?;
    repository::write_configs(db, &doc_id, &environments).await?;
    Ok(doc_id)
}
