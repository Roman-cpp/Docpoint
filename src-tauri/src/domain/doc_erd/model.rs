use serde::{Deserialize, Serialize};

/// An ERD diagram: a named canvas that groups entities (tables) and their
/// relations. Stored in `doc_erds`; entities point back via `entities.doc_erd_id`.
#[derive(Debug, Serialize, Deserialize)]
pub struct DocErd {
    pub id: String,
    pub name: String,
    pub desc: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateDocErdDTO {
    pub name: String,
    pub desc: String,
    /// The microservice this diagram is attached to, if created from a service
    /// page. `None` leaves it unattached.
    #[serde(default)]
    pub service_id: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateDocErdDTO {
    pub id: String,
    pub name: String,
    pub desc: String,
}
