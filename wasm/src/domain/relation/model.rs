//! The relation domain model: a directed edge between two table columns.

/// A directed relation: primary-key side (`from`) to foreign-key side (`to`),
/// each addressed as `(table_index, column_index)`.
pub struct Relation {
    pub from: (usize, usize),
    pub to: (usize, usize),
}
