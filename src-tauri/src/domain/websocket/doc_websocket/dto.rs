use serde::Deserialize;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateDocWebsocketDTO {
    pub id: String,
    pub name: String,
    #[serde(default)]
    pub url: String,
}
