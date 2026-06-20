use serde::{Deserialize, Serialize};

/// An ERD diagram: a named canvas that groups entities (tables) and their
/// relations. Stored in `doc_erds`; entities point back via `entities.doc_erd_id`.
#[derive(Debug, Serialize, Deserialize)]
pub struct DocErd {
    pub id: String,
    pub name: String,
    pub desc: String,
}
