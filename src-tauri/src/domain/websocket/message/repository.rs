use super::dto::{CreateWebsocketMessageDTO, UpdateWebsocketMessageDTO};
use super::entity::WebsocketMessage;

pub trait WebsocketMessageRepository {
    async fn by_websocket(&self, websocket_id: &str) -> Result<Vec<WebsocketMessage>, String>;
    async fn create(&self, dto: &CreateWebsocketMessageDTO) -> Result<String, String>;
    async fn update(&self, dto: &UpdateWebsocketMessageDTO) -> Result<(), String>;
    async fn delete(&self, id: &str) -> Result<(), String>;
}
