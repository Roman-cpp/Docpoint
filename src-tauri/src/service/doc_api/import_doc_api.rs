use crate::domain::doc_api::doc_api::dto::CreateDocApiDTO;
use crate::domain::doc_api::doc_api::repository::DocRepository;
use crate::repository::sqlite::doc_api::DocRepo;
use crate::domain::doc_erd::entity::dto::CreateEntityDTO;
use crate::domain::doc_erd::entity::repository::EntityRepository;
use crate::repository::sqlite::entity::EntityRepo;
use crate::domain::environment::environment::dto::CreateEnvironmentDTO;
use crate::domain::environment::environment::repository::EnvironmentRepository;
use crate::repository::sqlite::environment::EnvironmentRepo;
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
