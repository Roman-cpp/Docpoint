use serde::{Deserialize, Serialize};

/// Область на ERD-холсте: подписанный прямоугольник, поверх которого лежат
/// таблицы. Своего состава у неё нет — областью владеются те таблицы, что
/// попали внутрь прямоугольника (см. миграцию 0051), поэтому здесь только
/// подпись и геометрия в мировых координатах сцены.
#[derive(Debug, Serialize, Deserialize)]
pub struct Frame {
    pub id: String,
    pub title: String,
    pub x: f64,
    pub y: f64,
    pub w: f64,
    pub h: f64,
}
