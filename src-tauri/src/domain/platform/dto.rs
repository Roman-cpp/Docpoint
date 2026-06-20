use serde::Deserialize;

#[derive(Debug, Deserialize)]
pub struct CreatePlatformDTO {
    pub name: String,
    pub desc: String,
}

#[derive(Debug, Deserialize)]
pub struct UpdatePlatformDTO {
    pub id: String,
    pub name: String,
    pub desc: String,
}
