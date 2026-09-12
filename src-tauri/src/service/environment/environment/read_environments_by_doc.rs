use crate::domain::doc_api::doc_api::repository::DocApiRepository;
use crate::domain::environment::environment::entity::Environment;
use crate::repository::sqlite::doc_api::DocApiRepo;
use crate::state::AppState;

pub async fn read_environments_by_doc(
    state: &AppState,
    doc_id: String,
) -> Result<Vec<Environment>, String> {
    DocApiRepo::new(&state.db)
        .environments_by_doc(&doc_id)
        .await
}
