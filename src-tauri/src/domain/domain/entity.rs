use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Domain {
    pub id: String,
    pub name: String,
    pub desc: String,
    /// Owning platform. Required since migration 0024: a domain's files live
    /// under its platform's directory, so it cannot exist without one.
    pub platform_id: String,
}
