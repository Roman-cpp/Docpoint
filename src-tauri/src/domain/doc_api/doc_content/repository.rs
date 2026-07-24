/// Storage for the markdown bodies of doc-api documents, keyed by doc id.
///
/// These bodies belong to a database row, not to the user's file tree, so they
/// live outside the browsable vault: deleting a doc removes its body, and the
/// file explorer can never orphan one.
pub trait DocContentRepository {
    /// Body of a doc, or an empty string when it has none yet — so the editor
    /// can open a fresh document without erroring.
    async fn read(&self, doc_id: &str) -> Result<String, String>;
    async fn write(&self, doc_id: &str, content: &str) -> Result<(), String>;
    async fn delete(&self, doc_id: &str) -> Result<(), String>;
}
