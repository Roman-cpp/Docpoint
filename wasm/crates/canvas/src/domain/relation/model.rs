//! The relation domain model: a directed edge between two table columns.

/// A column endpoint, addressed as `(table_index, column_index)`.
pub type Endpoint = (usize, usize);

use super::super::diff::model::DiffStatus;

/// A directed relation: primary-key side (`from`) to foreign-key side (`to`).
pub struct Relation {
    pub from: Endpoint,
    pub to: Endpoint,
    /// Откуда эта связь известна. Вне сравнения — `Same`; `OnlyInDb` помечены
    /// те, что сравнение дорисовало по внешним ключам базы, — их и убирают при
    /// выходе из режима.
    pub status: DiffStatus,
}

impl Relation {
    pub fn new(from: Endpoint, to: Endpoint) -> Relation {
        Relation {
            from,
            to,
            status: DiffStatus::Same,
        }
    }

    /// Whether this relation joins exactly the two given endpoints, in either
    /// direction. Used to reject duplicate links.
    pub fn connects(&self, a: Endpoint, b: Endpoint) -> bool {
        (self.from == a && self.to == b) || (self.from == b && self.to == a)
    }
}
