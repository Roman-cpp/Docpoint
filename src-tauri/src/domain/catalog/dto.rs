use serde::Deserialize;

use super::entity::NodeKind;

/// Полезная нагрузка создаваемого узла. Вид узла выводится из неё, поэтому
/// создать doc-ws без адреса или doc-api без префикса по ошибке нельзя.
#[derive(Debug, Deserialize)]
#[serde(tag = "kind", rename_all = "camelCase")]
pub enum NodePayload {
    Catalog,
    #[serde(rename_all = "camelCase")]
    DocApi {
        #[serde(default)]
        prefix: String,
    },
    #[serde(rename_all = "camelCase")]
    DocWs {
        #[serde(default)]
        url: String,
    },
    DocErd,
    #[serde(rename_all = "camelCase")]
    Markdown {
        #[serde(default)]
        content: String,
    },
    /// Путь к файлу на диске, который нужно забрать в хранилище. Сам файл в
    /// нагрузку не кладётся: он может быть сколь угодно большим, а бэкенд
    /// открывает его сам.
    #[serde(rename_all = "camelCase")]
    File {
        source_path: String,
    },
}

impl NodePayload {
    /// Префикс doc-api, если нагрузка — документ API. Импорт берёт его из
    /// заголовка файла и на ветке обновления, где узел не создаётся.
    pub fn doc_api_prefix(&self) -> Option<&str> {
        match self {
            Self::DocApi { prefix } => Some(prefix),
            _ => None,
        }
    }

    pub fn kind(&self) -> NodeKind {
        match self {
            Self::Catalog => NodeKind::Catalog,
            Self::DocApi { .. } => NodeKind::DocApi,
            Self::DocWs { .. } => NodeKind::DocWs,
            Self::DocErd => NodeKind::DocErd,
            Self::Markdown { .. } => NodeKind::Markdown,
            Self::File { .. } => NodeKind::File,
        }
    }
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateNodeDTO {
    /// Id создаваемого узла. `None` — сгенерировать; задаёт его только импорт,
    /// которому id приезжает из файла.
    #[serde(default)]
    pub id: Option<String>,
    pub platform_id: String,
    /// `None` — создать в корне платформы.
    #[serde(default)]
    pub parent_id: Option<String>,
    pub name: String,
    pub payload: NodePayload,
}

/// Строка узла без полезной нагрузки — то, что пишет репозиторий дерева.
pub struct NewNode<'a> {
    pub platform_id: &'a str,
    pub parent_id: Option<&'a str>,
    pub kind: NodeKind,
    pub name: &'a str,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RenameNodeDTO {
    pub id: String,
    pub name: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MoveNodeDTO {
    pub id: String,
    /// `None` — перенести в корень платформы.
    #[serde(default)]
    pub parent_id: Option<String>,
}
