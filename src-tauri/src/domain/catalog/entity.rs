use serde::{Deserialize, Serialize};

/// Вид узла дерева. `Catalog` — папка, остальные виды — документы; их id
/// одновременно является id самого документа.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum NodeKind {
    Catalog,
    DocApi,
    DocWs,
    DocErd,
    Markdown,
    File,
}

impl NodeKind {
    /// Значение колонки `catalog_node.kind`.
    pub fn as_db(self) -> &'static str {
        match self {
            Self::Catalog => "catalog",
            Self::DocApi => "doc_api",
            Self::DocWs => "doc_ws",
            Self::DocErd => "doc_erd",
            Self::Markdown => "markdown",
            Self::File => "file",
        }
    }

    pub fn from_db(value: &str) -> Result<Self, String> {
        match value {
            "catalog" => Ok(Self::Catalog),
            "doc_api" => Ok(Self::DocApi),
            "doc_ws" => Ok(Self::DocWs),
            "doc_erd" => Ok(Self::DocErd),
            "markdown" => Ok(Self::Markdown),
            "file" => Ok(Self::File),
            other => Err(format!("unknown node kind: {other}")),
        }
    }

    /// Хранится ли тело узла файлом в content-хранилище. Определяет, что нужно
    /// удалить с диска вместе со строкой.
    pub fn has_content(self) -> bool {
        matches!(self, Self::DocApi | Self::Markdown)
    }

    /// Лежит ли рядом с узлом загруженный файл. Определяет, что нужно убрать с
    /// диска вместе со строкой.
    pub fn has_file(self) -> bool {
        matches!(self, Self::File)
    }

    /// Может ли узел содержать другие узлы. Документы — листья дерева.
    pub fn is_container(self) -> bool {
        matches!(self, Self::Catalog)
    }
}

/// Узел дерева платформы: каталог или документ.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CatalogNode {
    pub id: String,
    pub platform_id: String,
    /// `None` — узел лежит в корне платформы. Строки-корня не существует.
    pub parent_id: Option<String>,
    pub kind: NodeKind,
    pub name: String,
    pub desc: String,
    pub created_at: String,
    pub updated_at: String,
}
