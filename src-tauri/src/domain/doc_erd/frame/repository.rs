use super::dto::{CreateFrameDTO, FrameBoundsDTO, UpdateFrameDTO};
use super::entity::Frame;

pub trait FrameRepository {
    async fn all_by_erd(&self, doc_erd_id: &str) -> Result<Vec<Frame>, String>;
    async fn create_for_erd(
        &self,
        doc_erd_id: &str,
        frame: &CreateFrameDTO,
    ) -> Result<String, String>;
    async fn update(&self, frame: &UpdateFrameDTO) -> Result<(), String>;
    /// Сохраняет границы областей одной транзакцией. Подписи не касается,
    /// поэтому перетаскивание не конфликтует с переименованием.
    async fn update_bounds(&self, bounds: &[FrameBoundsDTO]) -> Result<(), String>;
    async fn delete(&self, frame_id: &str) -> Result<(), String>;
}
