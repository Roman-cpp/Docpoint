use super::dto::{ImportEndpointRequestDTO, SaveEndpointRequestDTO};
use super::entity::EndpointRequest;
use crate::domain::doc_api::endpoint::entity::path_segments;
use std::collections::HashMap;

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

/// Значения набора из файла, разложенные по `(kind, name)` — ровно то, что
/// ляжет в `request_param_values`.
///
/// Чистая функция, а не часть записи: повторный импорт сверяет весь файл до
/// первой записи в базу, и проверять его вторым, отдельно написанным способом
/// значило бы разойтись с тем, что потом действительно сохранится.
///
/// Пустые значения не храним — как и `save`, иначе состояние после импорта
/// разъезжалось бы с тем, что видно в панели. Дубликаты по `(kind, name)`
/// запрещены первичным ключом; здесь побеждает последний, вместо того чтобы
/// ронять весь файл. Устаревший `values[]` кладём первым, чтобы явные карты
/// `path` и `query` его перекрывали.
pub fn resolve_values<'a>(
    target: &RequestTarget<'_>,
    request: &'a ImportEndpointRequestDTO,
) -> Result<HashMap<(&'a str, &'a str), &'a str>, String> {
    // Кривой `kind` уронил бы вставку на CHECK-констрейнте таблицы с
    // невнятным текстом от SQLite — проверяем заранее, до записи.
    for value in &request.values {
        if value.kind == "body" {
            return Err(format!(
                "набор {:?}: тело задаётся полем \"body\", а не значением с kind: \"body\"",
                request.name
            ));
        }
        if !matches!(value.kind.as_str(), "path" | "query") {
            return Err(format!(
                "неизвестный вид параметра {:?} в наборе {:?}",
                value.kind, request.name
            ));
        }
    }

    let mut values: HashMap<(&str, &str), &str> = HashMap::new();
    for value in request.values.iter().filter(|v| !v.value.is_empty()) {
        values.insert((&value.kind, &value.name), &value.value);
    }
    for (name, value) in request.path.iter().filter(|(_, v)| !v.is_empty()) {
        values.insert(("path", name), value);
    }
    for (name, value) in request.query.iter().filter(|(_, v)| !v.is_empty()) {
        values.insert(("query", name), value);
    }

    // Значение с чужим именем никуда не подставится: сегменты берутся из
    // пути, а query — из схемы эндпоинта. Молча сохранить его — значит
    // спрятать опечатку до первой отправки запроса.
    let path_params = target.path_params();
    for (kind, name) in values.keys() {
        let known = match *kind {
            "path" => path_params.contains(name),
            _ => target.query_names.contains(name),
        };
        if !known {
            return Err(match *kind {
                "path" => format!(
                    "набор {:?}: в пути {} нет сегмента {name:?}",
                    request.name, target.path
                ),
                _ => format!(
                    "набор {:?}: параметр {name:?} не описан в queryParams эндпоинта {}",
                    request.name, target.path
                ),
            });
        }
    }

    Ok(values)
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
    /// Дописывает набор из файла в эндпоинт, который уже существует: набор с
    /// тем же именем перезаписывается на своём месте, новый добавляется в
    /// конец. Наборы, которых в файле нет, остаются нетронутыми — их мог
    /// завести пользователь руками в панели «Try it».
    async fn upsert(
        &self,
        target: &RequestTarget<'_>,
        request: &ImportEndpointRequestDTO,
    ) -> Result<(), String>;
    async fn delete(&self, id: &str) -> Result<(), String>;
    /// Перезаписывает набор целиком: имя, режим и тело, заголовки и значения.
    async fn save(&self, request: &SaveEndpointRequestDTO) -> Result<(), String>;
}
