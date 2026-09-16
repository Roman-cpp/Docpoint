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

/// Сообщение внутри файла импорта. `id` и `websocketId` из файла не читаются:
/// сообщение опознаётся по имени внутри своего сокета, а id ему выдаёт база.
#[derive(Debug, Deserialize)]
pub struct ImportWebsocketMessageDTO {
    pub name: String,
    #[serde(default)]
    pub payload: String,
    #[serde(default)]
    pub desc: String,
}
