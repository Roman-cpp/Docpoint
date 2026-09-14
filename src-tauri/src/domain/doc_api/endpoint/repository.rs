use super::dto::{CreateEndpointDTO, UpdateEndpointDTO};

pub trait EndpointRepository {
    /// Заводит эндпоинт и возвращает сгенерированный id. Id нужен вызывающему,
    /// чтобы привязать к свежему эндпоинту то, что лежит рядом в импортируемом
    /// файле — наборы запросов «Try it» и прочее содержимое.
    async fn create(&self, group_id: &str, endpoint: &CreateEndpointDTO) -> Result<String, String>;
    async fn update(&self, endpoint: &UpdateEndpointDTO) -> Result<(), String>;
    async fn delete(&self, endpoint_id: &str) -> Result<(), String>;
}
