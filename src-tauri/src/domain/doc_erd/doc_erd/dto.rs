use serde::Deserialize;

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
