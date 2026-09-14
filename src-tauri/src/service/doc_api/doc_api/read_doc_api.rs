use crate::domain::doc_api::doc_api::entity::DocApi;
use crate::domain::doc_api::doc_api::repository::DocApiRepository;
use crate::repository::sqlite::doc_api::DocApiRepo;
use crate::state::AppState;

pub async fn read_doc(state: &AppState, id: String) -> Result<Option<DocApi>, String> {
    DocApiRepo::new(&state.db).find(&id).await
}
