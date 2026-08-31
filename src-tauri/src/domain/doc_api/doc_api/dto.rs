use serde::Deserialize;

/// Собственные поля doc-api — то, что не помещается в узел дерева.
#[derive(Debug, Default, Deserialize)]
pub struct DocApiPayload {
    pub prefix: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateDocApiDTO {
    pub id: String,
    pub name: String,
    #[serde(default)]
    pub desc: String,
    #[serde(default)]
    pub prefix: String,
}
