use super::dto::{CreateEndpointDTO, UpdateEndpointDTO};

pub trait EndpointRepository {
    async fn create(&self, group_id: &str, endpoint: &CreateEndpointDTO) -> Result<(), String>;
    async fn update(&self, endpoint: &UpdateEndpointDTO) -> Result<(), String>;
    async fn delete(&self, endpoint_id: &str) -> Result<(), String>;
}
