use serde::Deserialize;

/// Новая область: прямоугольник, который пользователь только что протянул по
/// холсту. Подпись к этому моменту ещё не введена — её задают уже готовой
/// области, поэтому по умолчанию она пустая.
#[derive(Debug, Deserialize)]
pub struct CreateFrameDTO {
    #[serde(default)]
    pub title: String,
    pub x: f64,
    pub y: f64,
    pub w: f64,
    pub h: f64,
}

/// Правка подписи. Геометрию сюда не кладём: её меняет холст, и у неё свой
/// путь — [`FrameBoundsDTO`].
#[derive(Debug, Deserialize)]
pub struct UpdateFrameDTO {
    pub id: String,
    pub title: String,
}

/// Новые границы одной области. Приходят пачкой: холст копит перемещения и
/// растягивания и сбрасывает их одним вызовом — как и позиции таблиц.
#[derive(Debug, Deserialize)]
pub struct FrameBoundsDTO {
    pub id: String,
    pub x: f64,
    pub y: f64,
    pub w: f64,
    pub h: f64,
}
