use crate::domain::doc_erd::frame::dto::FrameBoundsDTO;
use crate::domain::doc_erd::frame::repository::FrameRepository;
use crate::repository::sqlite::erd_frame::FrameRepo;
use crate::state::AppState;

pub async fn update_erd_frame_bounds(
    state: &AppState,
    bounds: Vec<FrameBoundsDTO>,
) -> Result<(), String> {
    FrameRepo::new(&state.db).update_bounds(&bounds).await
}
