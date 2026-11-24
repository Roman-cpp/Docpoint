use super::dto::{CreateEndpointDTO, UpdateEndpointDTO};
use super::entity::EndpointRef;

pub trait EndpointRepository {
    /// Заводит эндпоинт и возвращает сгенерированный id. Id нужен вызывающему,
    /// чтобы привязать к свежему эндпоинту то, что лежит рядом в импортируемом
    /// файле — наборы запросов «Try it» и прочее содержимое.
    async fn create(&self, group_id: &str, endpoint: &CreateEndpointDTO) -> Result<String, String>;
    async fn update(&self, endpoint: &UpdateEndpointDTO) -> Result<(), String>;
    /// Эндпоинт документа по его сигнатуре — паре «метод + путь». Именно она
    /// опознаёт эндпоинт при повторном импорте файла, и ищется по всему
    /// документу, а не внутри группы: иначе эндпоинт, переложенный в файле в
    /// другую группу, задвоился бы.
    async fn find_by_signature(
        &self,
        doc_id: &str,
        method: &str,
        path: &str,
    ) -> Result<Option<EndpointRef>, String>;
    /// Переносит эндпоинт в конец другой группы.
    async fn move_to_group(&self, endpoint_id: &str, group_id: &str) -> Result<(), String>;
    async fn delete(&self, endpoint_id: &str) -> Result<(), String>;
}
