use serde::Deserialize;

/// Which area of the vault an operation addresses.
///
/// The frontend never builds vault paths itself — it names the owning entity and
/// the backend resolves that to a directory (see `service::vault::scope_dir`).
/// A service therefore does not carry its platform id here: it is looked up in
/// the database, so a service that moved to another platform can never be
/// addressed through a stale path.
#[derive(Debug, Clone, Deserialize)]
#[serde(tag = "kind", rename_all = "camelCase")]
pub enum FileScope {
    /// Files owned by a platform itself, shared across its services.
    #[serde(rename_all = "camelCase")]
    Platform { platform_id: String },
    /// Files owned by a single microservice.
    #[serde(rename_all = "camelCase")]
    Service { service_id: String },
}
