use std::path::{Path, PathBuf};

/// Folder holding the user files of a platform or a service. Keeping them one
/// level down means a user file can never be mistaken for — or collide with —
/// a structural folder such as `services`.
const FILES: &str = "files";

/// Physical layout of the vault. The only place in the codebase that knows how
/// platforms and services map onto directories:
///
/// ```text
/// <vault>/platforms/<platform_id>/files
/// <vault>/platforms/<platform_id>/services/<service_id>/files
/// ```
///
/// Ids are UUIDs, so folder names stay stable when an entity is renamed.
pub struct VaultLayout<'a> {
    root: &'a Path,
}

impl<'a> VaultLayout<'a> {
    pub fn new(root: &'a Path) -> Self {
        Self { root }
    }

    /// Everything owned by a platform, including its services.
    pub fn platform_dir(&self, platform_id: &str) -> Result<PathBuf, String> {
        Ok(self.root.join("platforms").join(safe_id(platform_id)?))
    }

    /// User files of the platform itself.
    pub fn platform_files(&self, platform_id: &str) -> Result<PathBuf, String> {
        Ok(self.platform_dir(platform_id)?.join(FILES))
    }

    /// Everything owned by a single service.
    pub fn service_dir(&self, platform_id: &str, service_id: &str) -> Result<PathBuf, String> {
        Ok(self
            .platform_dir(platform_id)?
            .join("services")
            .join(safe_id(service_id)?))
    }

    /// User files of a service.
    pub fn service_files(&self, platform_id: &str, service_id: &str) -> Result<PathBuf, String> {
        Ok(self.service_dir(platform_id, service_id)?.join(FILES))
    }
}

/// Validate an entity id used as a single directory name. Ids come from the
/// frontend, so they are checked before they ever reach the filesystem.
pub fn safe_id(id: &str) -> Result<&str, String> {
    if id.contains('/') {
        return Err(format!("invalid id: {id:?}"));
    }
    check_segment(id)?;
    Ok(id)
}

/// Resolve a `/`-separated path against `base`, rejecting any component that
/// could escape it. An empty path resolves to `base` itself.
pub fn resolve_in(base: &Path, rel: &str) -> Result<PathBuf, String> {
    if rel.is_empty() {
        return Ok(base.to_path_buf());
    }

    let mut path = base.to_path_buf();
    for segment in rel.split('/') {
        check_segment(segment)?;
        path.push(segment);
    }
    Ok(path)
}

/// Path of `path` relative to `base`, always `/`-separated — the inverse of
/// [`resolve_in`].
pub fn relative_to(base: &Path, path: &Path) -> Result<String, String> {
    let rel = path.strip_prefix(base).map_err(|e| e.to_string())?;
    Ok(rel
        .components()
        .map(|c| c.as_os_str().to_string_lossy())
        .collect::<Vec<_>>()
        .join("/"))
}

/// Reject path components that could escape their base directory: empty
/// segments, `.`, `..`, and backslashes (a separator on Windows, an ordinary
/// character in a Unix file name — so a name containing one is never safe on
/// both).
fn check_segment(segment: &str) -> Result<(), String> {
    if segment.is_empty() || segment == "." || segment == ".." || segment.contains('\\') {
        return Err(format!("invalid path segment: {segment:?}"));
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn resolves_nested_paths_and_the_scope_root() {
        let base = Path::new("/vault");
        assert_eq!(resolve_in(base, "").unwrap(), base);
        assert_eq!(
            resolve_in(base, "docs/api.md").unwrap(),
            Path::new("/vault/docs/api.md")
        );
    }

    #[test]
    fn rejects_every_way_out_of_the_scope() {
        let base = Path::new("/vault");
        for escape in ["..", "../etc", "docs/../..", "a//b", ".", "a\\b"] {
            assert!(resolve_in(base, escape).is_err(), "accepted {escape:?}");
        }
    }

    #[test]
    fn rejects_ids_that_are_not_a_single_component() {
        for bad in ["", "..", "a/b", "a\\b"] {
            assert!(safe_id(bad).is_err(), "accepted {bad:?}");
        }
        assert!(safe_id("3f2a91c8-0000-4000-8000-000000000000").is_ok());
    }

    #[test]
    fn relative_to_is_the_inverse_of_resolve_in() {
        let base = Path::new("/vault");
        let abs = resolve_in(base, "docs/api.md").unwrap();
        assert_eq!(relative_to(base, &abs).unwrap(), "docs/api.md");
    }
}
