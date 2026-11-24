use crate::domain::doc_erd::frame::dto::CreateFrameDTO;
use crate::domain::doc_erd::frame::repository::FrameRepository;
use crate::repository::sqlite::erd_frame::FrameRepo;
use crate::state::AppState;

pub async fn create_erd_frame(
    state: &AppState,
    doc_erd_id: String,
    frame: CreateFrameDTO,
) -> Result<String, String> {
    FrameRepo::new(&state.db)
        .create_for_erd(&doc_erd_id, &frame)
        .await
}
