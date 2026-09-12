use crate::domain::doc_api::doc_api::entity::DocApi;
use crate::domain::doc_api::doc_api::repository::DocApiRepository;
use crate::repository::sqlite::doc_api::DocApiRepo;
use crate::state::AppState;

/// Все doc-api — список для http-клиента, которому нужен документ, а не его
/// место в дереве.
pub async fn read_docs(state: &AppState) -> Result<Vec<DocApi>, String> {
    DocApiRepo::new(&state.db).all().await
}
