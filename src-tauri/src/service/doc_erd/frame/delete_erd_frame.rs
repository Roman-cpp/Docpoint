use crate::domain::doc_erd::frame::repository::FrameRepository;
use crate::repository::sqlite::erd_frame::FrameRepo;
use crate::state::AppState;

pub async fn delete_erd_frame(state: &AppState, frame_id: String) -> Result<(), String> {
    FrameRepo::new(&state.db).delete(&frame_id).await
}
