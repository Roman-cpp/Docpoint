use serde::Serialize;

/// Markdown-документ: узел дерева вместе с прочитанным телом.
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MarkdownDoc {
    pub id: String,
    pub name: String,
    pub content: String,
    pub updated_at: String,
}
