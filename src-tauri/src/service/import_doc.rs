use crate::domain::doc::model::CreateDocDTO;
use crate::domain::doc::repository::{DocRepo, DocRepository};
use crate::domain::entity::model::CreateEntityDTO;
use crate::domain::entity::repository::{EntityRepo, EntityRepository};
use crate::domain::environment::model::CreateEnvironmentDTO;
use crate::domain::environment::repository::{EnvironmentRepo, EnvironmentRepository};
use crate::domain::group::model::CreateGroupDTO;
use crate::domain::group::repository::{GroupRepo, GroupRepository};
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn import_doc(
    state: State<'_, AppState>,
    doc: CreateDocDTO,
    groups: Vec<CreateGroupDTO>,
    entities: Vec<CreateEntityDTO>,
    environments: Vec<CreateEnvironmentDTO>,
) -> Result<String, String> {
    let db = &state.db;
    let doc_id = DocRepo::new(db).create(&doc).await?;
    GroupRepo::new(db).create(&doc_id, &groups).await?;
    for entitie in &entities {
      EntityRepo::new(db).create(&doc_id, &entitie).await?;
    }
    // Environments are now owned by platforms, not docs. An imported doc has no
    // platform yet, so its environments are persisted unassigned (platform_id NULL);
    // they are not reachable until reassigned to a platform.
    EnvironmentRepo::new(db)
        .write_configs(None, &environments)
        .await?;
    Ok(doc_id)
}
