use crate::domain::doc_erd::frame::dto::UpdateFrameDTO;
use crate::domain::doc_erd::frame::repository::FrameRepository;
use crate::repository::sqlite::erd_frame::FrameRepo;
use crate::state::AppState;

pub async fn update_erd_frame(state: &AppState, frame: UpdateFrameDTO) -> Result<(), String> {
    FrameRepo::new(&state.db).update(&frame).await
}
