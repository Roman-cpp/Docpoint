use crate::domain::doc_api::group::repository::GroupRepository;
use crate::repository::sqlite::group::GroupRepo;
use crate::state::AppState;

pub async fn delete_group(state: &AppState, group_id: String) -> Result<(), String> {
    GroupRepo::new(&state.db).delete(&group_id).await
}
