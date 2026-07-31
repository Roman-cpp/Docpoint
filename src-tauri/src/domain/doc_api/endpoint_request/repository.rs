use super::dto::SaveEndpointRequestDTO;
use super::entity::EndpointRequest;

pub trait EndpointRequestRepository {
    /// Все наборы эндпоинта вместе с их содержимым, в порядке sort_ord.
    async fn list(&self, endpoint_id: &str) -> Result<Vec<EndpointRequest>, String>;
    async fn create(&self, endpoint_id: &str, name: &str) -> Result<EndpointRequest, String>;
    async fn delete(&self, id: &str) -> Result<(), String>;
    /// Перезаписывает набор целиком: имя, режим и тело, заголовки и значения.
    async fn save(&self, request: &SaveEndpointRequestDTO) -> Result<(), String>;
}
