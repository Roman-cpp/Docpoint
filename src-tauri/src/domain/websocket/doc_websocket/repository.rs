use super::dto::{CreateDocWebsocketDTO, UpdateDocWebsocketDTO};
use super::entity::DocWebsocket;

pub trait DocWebsocketRepository {
    async fn all(&self) -> Result<Vec<DocWebsocket>, String>;
    async fn by_service(&self, service_id: &str) -> Result<Vec<DocWebsocket>, String>;
    async fn create(&self, dto: &CreateDocWebsocketDTO) -> Result<String, String>;
    async fn update(&self, dto: &UpdateDocWebsocketDTO) -> Result<(), String>;
    async fn delete(&self, id: &str) -> Result<(), String>;
}
