use serde::Serialize;

/// Итог импорта диаграммы. Диаграмму выбирает сам файл — по своему `id`, —
/// поэтому в отчёте есть и она: пользователь не указывал, куда лить, и должен
/// увидеть, куда прилетело и завели ли диаграмму заново.
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportErdReport {
    pub doc_id: String,
    pub doc_name: String,
    /// `true` — диаграммы с таким id не было, и она заведена этим импортом.
    pub created: bool,
    pub tables_added: usize,
    pub tables_updated: usize,
    pub relations_added: usize,
}
