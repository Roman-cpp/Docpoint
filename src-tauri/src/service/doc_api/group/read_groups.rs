use crate::domain::doc_api::group::entity::Group;
use crate::domain::doc_api::group::repository::GroupRepository;
use crate::repository::sqlite::group::GroupRepo;
use crate::state::AppState;

pub async fn read_groups(state: &AppState, doc_id: String) -> Result<Vec<Group>, String> {
    GroupRepo::new(&state.db).all(&doc_id).await
}
