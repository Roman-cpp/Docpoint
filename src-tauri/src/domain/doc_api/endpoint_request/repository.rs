use super::dto::{ImportEndpointRequestDTO, SaveEndpointRequestDTO};
use super::entity::EndpointRequest;
use crate::domain::doc_api::endpoint::entity::path_segments;

/// Эндпоинт, в который импортируется набор: id для записи плюс его параметры.
/// Последние нужны, чтобы поймать значение, которое никуда не подставится, —
/// имя сегмента с опечаткой раньше молча оседало в базе.
pub struct RequestTarget<'a> {
    pub endpoint_id: &'a str,
    /// Путь эндпоинта: из него берутся имена сегментов.
    pub path: &'a str,
    /// Имена параметров, объявленных в `queryParams`.
    pub query_names: Vec<&'a str>,
}

impl RequestTarget<'_> {
    /// Имена сегментов пути, в которые можно подставить значение.
    pub fn path_params(&self) -> Vec<&str> {
        path_segments(self.path)
    }
}

pub trait EndpointRequestRepository {
    /// Все наборы эндпоинта вместе с их содержимым, в порядке sort_ord.
    async fn list(&self, endpoint_id: &str) -> Result<Vec<EndpointRequest>, String>;
    async fn create(&self, endpoint_id: &str, name: &str) -> Result<EndpointRequest, String>;
    /// Заводит набор целиком из импортируемого файла, со свежим id.
    /// В отличие от [`save`](Self::save), которая правит существующую строку.
    async fn insert(
        &self,
        target: &RequestTarget<'_>,
        sort_ord: i64,
        request: &ImportEndpointRequestDTO,
    ) -> Result<(), String>;
    async fn delete(&self, id: &str) -> Result<(), String>;
    /// Перезаписывает набор целиком: имя, режим и тело, заголовки и значения.
    async fn save(&self, request: &SaveEndpointRequestDTO) -> Result<(), String>;
}
