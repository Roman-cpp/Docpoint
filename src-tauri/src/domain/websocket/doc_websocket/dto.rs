use serde::Deserialize;

#[derive(Debug, Deserialize)]
pub struct CreateDocWebsocketDTO {
    pub name: String,
    pub desc: String,
    pub url: String,
    /// The microservice this socket is attached to, if created from a service
    /// page. `None` leaves it unattached.
    #[serde(default)]
    pub service_id: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateDocWebsocketDTO {
    pub id: String,
    pub name: String,
    pub desc: String,
    pub url: String,
}
