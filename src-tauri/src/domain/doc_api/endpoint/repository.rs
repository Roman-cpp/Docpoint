use super::dto::CreateEndpointDTO;

pub trait EndpointRepository {
    async fn create(&self, group_id: &str, endpoint: &CreateEndpointDTO) -> Result<(), String>;
    async fn delete(&self, endpoint_id: &str) -> Result<(), String>;
}
