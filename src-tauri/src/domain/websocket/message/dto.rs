use serde::Deserialize;

#[derive(Debug, Deserialize)]
pub struct CreateWebsocketMessageDTO {
    pub websocket_id: String,
    pub name: String,
    pub payload: String,
    pub desc: String,
}

#[derive(Debug, Deserialize)]
pub struct UpdateWebsocketMessageDTO {
    pub id: String,
    pub name: String,
    pub payload: String,
    pub desc: String,
}
