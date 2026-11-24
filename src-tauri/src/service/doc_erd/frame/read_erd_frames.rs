use crate::domain::doc_erd::frame::entity::Frame;
use crate::domain::doc_erd::frame::repository::FrameRepository;
use crate::repository::sqlite::erd_frame::FrameRepo;
use crate::state::AppState;

pub async fn read_erd_frames(state: &AppState, doc_erd_id: String) -> Result<Vec<Frame>, String> {
    FrameRepo::new(&state.db).all_by_erd(&doc_erd_id).await
}
