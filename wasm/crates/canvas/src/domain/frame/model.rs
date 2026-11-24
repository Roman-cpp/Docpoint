//! Область: подписанный прямоугольник, которым таблицы группируются по смыслу.
//!
//! Своего состава у области нет — ей принадлежат те таблицы, что целиком лежат
//! внутри её прямоугольника. Состав пересчитывается в момент захвата области и
//! нигде не хранится, поэтому «положить таблицу в группу» и «подвинуть таблицу»
//! — одно и то же действие.
//!
//! Подпись живёт **над** верхней гранью, а не полосой внутри: полосу внутри
//! неизбежно перекрыла бы таблица, которую на неё перетащили, и область
//! осталась бы без единой постоянной зоны захвата.

/// Высота полосы с подписью над верхней гранью, в мировых пикселях.
pub const TITLE_H: f64 = 24.0;
/// Радиус скругления углов.
pub const CORNER_R: f64 = 12.0;
/// Наименьшие размеры при растягивании: область мельче этого уже ничего не
/// группирует, а ручки на ней сливаются в одну.
pub const MIN_W: f64 = 160.0;
pub const MIN_H: f64 = 120.0;

/// Ручка растягивания — угол или середина грани выделенной области.
#[derive(Clone, Copy, PartialEq)]
pub enum Handle {
    Nw,
    N,
    Ne,
    E,
    Se,
    S,
    Sw,
    W,
}

impl Handle {
    /// CSS-курсор, соответствующий направлению растягивания.
    pub fn cursor(self) -> &'static str {
        match self {
            Handle::Nw | Handle::Se => "nwse-resize",
            Handle::Ne | Handle::Sw => "nesw-resize",
            Handle::N | Handle::S => "ns-resize",
            Handle::E | Handle::W => "ew-resize",
        }
    }
}

/// Прямоугольник области в мировых координатах плюс подпись.
pub struct Frame {
    /// Id области в БД. В отличие от таблиц, безымянных областей не бывает:
    /// область появляется на холсте только после того, как её создала команда.
    pub id: String,
    pub title: String,
    pub x: f64,
    pub y: f64,
    pub w: f64,
    pub h: f64,
}

impl Frame {
    pub fn new(
        id: impl Into<String>,
        title: impl Into<String>,
        x: f64,
        y: f64,
        w: f64,
        h: f64,
    ) -> Frame {
        Frame {
            id: id.into(),
            title: title.into(),
            x,
            y,
            w,
            h,
        }
    }

    /// Точка внутри прямоугольника (без полосы подписи).
    pub fn contains(&self, x: f64, y: f64) -> bool {
        x >= self.x && x <= self.x + self.w && y >= self.y && y <= self.y + self.h
    }

    /// Точка на полосе подписи над верхней гранью.
    pub fn on_title(&self, x: f64, y: f64) -> bool {
        x >= self.x && x <= self.x + self.w && y >= self.y - TITLE_H && y < self.y
    }

    /// Точка на рамке — в кольце толщиной `tol` по обе стороны от неё. Тело
    /// области сюда не входит: по телу холст панорамируется.
    pub fn on_border(&self, x: f64, y: f64, tol: f64) -> bool {
        let outer = x >= self.x - tol
            && x <= self.x + self.w + tol
            && y >= self.y - tol
            && y <= self.y + self.h + tol;
        let inner = x > self.x + tol
            && x < self.x + self.w - tol
            && y > self.y + tol
            && y < self.y + self.h - tol;
        outer && !inner
    }

    /// Центры восьми ручек: четыре угла и середины граней.
    pub fn handles(&self) -> [(Handle, f64, f64); 8] {
        let (l, t) = (self.x, self.y);
        let (r, b) = (self.x + self.w, self.y + self.h);
        let (cx, cy) = (l + self.w * 0.5, t + self.h * 0.5);
        [
            (Handle::Nw, l, t),
            (Handle::N, cx, t),
            (Handle::Ne, r, t),
            (Handle::E, r, cy),
            (Handle::Se, r, b),
            (Handle::S, cx, b),
            (Handle::Sw, l, b),
            (Handle::W, l, cy),
        ]
    }

    /// Ручка под точкой. Углы идут первыми, поэтому в углу выигрывает
    /// диагональное растягивание, а не грань.
    pub fn handle_at(&self, x: f64, y: f64, tol: f64) -> Option<Handle> {
        self.handles()
            .into_iter()
            .find(|(_, hx, hy)| (x - hx).abs() <= tol && (y - hy).abs() <= tol)
            .map(|(h, _, _)| h)
    }

    /// Лежит ли прямоугольник таблицы целиком внутри области. Критерий именно
    /// «целиком»: таблица, наполовину свесившаяся за грань, не уезжает вслед за
    /// областью, которую её владелец даже не считал своей.
    pub fn holds(&self, x: f64, y: f64, w: f64, h: f64) -> bool {
        x >= self.x && y >= self.y && x + w <= self.x + self.w && y + h <= self.y + self.h
    }

    /// Границы после протаскивания ручки на `(dx, dy)` от исходных `start`.
    /// Грань упирается, не доходя до противоположной: размеры не опускаются
    /// ниже [`MIN_W`] / [`MIN_H`], а область не выворачивается наизнанку.
    pub fn resized(
        start: (f64, f64, f64, f64),
        handle: Handle,
        dx: f64,
        dy: f64,
    ) -> (f64, f64, f64, f64) {
        let (mut x, mut y, mut w, mut h) = start;

        let west = matches!(handle, Handle::Nw | Handle::W | Handle::Sw);
        let east = matches!(handle, Handle::Ne | Handle::E | Handle::Se);
        let north = matches!(handle, Handle::Nw | Handle::N | Handle::Ne);
        let south = matches!(handle, Handle::Sw | Handle::S | Handle::Se);

        if west {
            let d = dx.min(w - MIN_W);
            x += d;
            w -= d;
        }
        if east {
            w = (w + dx).max(MIN_W);
        }
        if north {
            let d = dy.min(h - MIN_H);
            y += d;
            h -= d;
        }
        if south {
            h = (h + dy).max(MIN_H);
        }

        (x, y, w, h)
    }
}
