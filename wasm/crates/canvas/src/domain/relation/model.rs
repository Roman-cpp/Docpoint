//! The relation domain model: a directed edge between two table columns.

/// A column endpoint, addressed as `(table_index, column_index)`.
pub type Endpoint = (usize, usize);

/// A directed relation: primary-key side (`from`) to foreign-key side (`to`).
pub struct Relation {
    pub from: Endpoint,
    pub to: Endpoint,
}

impl Relation {
    pub fn new(from: Endpoint, to: Endpoint) -> Relation {
        Relation { from, to }
    }

    /// Whether this relation joins exactly the two given endpoints, in either
    /// direction. Used to reject duplicate links.
    pub fn connects(&self, a: Endpoint, b: Endpoint) -> bool {
        (self.from == a && self.to == b) || (self.from == b && self.to == a)
    }
}
