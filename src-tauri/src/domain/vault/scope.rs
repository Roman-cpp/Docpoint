use serde::Deserialize;

/// Which area of the vault an operation addresses.
///
/// The frontend never builds vault paths itself — it names the owning entity and
/// the backend resolves that to a directory (see `service::vault::scope_dir`).
/// A domain therefore does not carry its platform id here: it is looked up in
/// the database, so a domain that moved to another platform can never be
/// addressed through a stale path.
#[derive(Debug, Clone, Deserialize)]
#[serde(tag = "kind", rename_all = "camelCase")]
pub enum FileScope {
    /// Files owned by a platform itself, shared across its domains.
    #[serde(rename_all = "camelCase")]
    Platform { platform_id: String },
    /// Files owned by a single domain.
    #[serde(rename_all = "camelCase")]
    Domain { domain_id: String },
}
