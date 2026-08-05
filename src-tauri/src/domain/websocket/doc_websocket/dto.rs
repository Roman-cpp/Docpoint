use serde::Deserialize;

#[derive(Debug, Deserialize)]
pub struct CreateDocWebsocketDTO {
    pub name: String,
    pub desc: String,
    pub url: String,
    /// The domain this socket is attached to, if created from a domain
    /// page. `None` leaves it unattached.
    #[serde(default)]
    pub domain_id: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateDocWebsocketDTO {
    pub id: String,
    pub name: String,
    pub desc: String,
    pub url: String,
}
