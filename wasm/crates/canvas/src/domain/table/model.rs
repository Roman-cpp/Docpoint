//! The table node domain model: a named entity with a stack of typed columns.
//!
//! A table owns its position (`x`, `y`) and width (`w`, computed from text by
//! the layout pass) and exposes the geometry the rest of the scene needs for
//! hit-testing and for anchoring relations. Rendering details (icons, padding,
//! colors) live in the render layer; only the table's *intrinsic* geometry —
//! its header band and per-row heights — lives here.

/// Height of the header band, in world / CSS pixels.
pub const HEADER_H: f64 = 38.0;
/// Height of a single column row, in world / CSS pixels.
pub const ROW_H: f64 = 30.0;

/// How a column is marked, which decides its row icon.
#[derive(Clone, Copy, PartialEq)]
pub enum ColKind {
    /// Primary key — green key icon.
    Pk,
    /// Foreign key — green link icon.
    Fk,
    /// Ordinary, NOT NULL column — filled diamond.
    Plain,
    /// Nullable column — hollow diamond.
    Nullable,
}

/// A single column within a table.
///
/// `pk` and `nullable` are the column's own facts, carried over from the
/// persisted field. `kind` is only the icon derived from them plus the scene's
/// current relations — `Scene::refresh_kinds` recomputes it whenever a relation
/// appears or goes away, so the flags have to stay around to derive it from.
pub struct Column {
    pub name: String,
    pub pk: bool,
    pub nullable: bool,
    pub kind: ColKind,
}

impl Column {
    /// A column with no relation attached yet — the icon starts at whatever
    /// `pk` / `nullable` alone imply, and `Scene::refresh_kinds` upgrades it to
    /// the foreign-key glyph once a relation points at it.
    pub fn new(name: impl Into<String>, pk: bool, nullable: bool) -> Column {
        Column {
            name: name.into(),
            pk,
            nullable,
            kind: if pk {
                ColKind::Pk
            } else if nullable {
                ColKind::Nullable
            } else {
                ColKind::Plain
            },
        }
    }
}

/// A single table node: header plus a stack of column rows. `w` is computed
/// once from the rendered text widths (see `Scene::ensure_layout`).
pub struct Table {
    /// Id сущности в БД — им адресуются и сохранение позиции, и концы связей.
    /// Пустая строка означает «таблица не персистится»: так помечена демо-схема,
    /// которой сцена заполняется до первого `load`.
    pub id: String,
    pub x: f64,
    pub y: f64,
    pub w: f64,
    pub name: String,
    pub columns: Vec<Column>,
}

impl Table {
    /// Builds a table with the given columns at the given top-left world
    /// position. Width is left at `0.0` as a placeholder — the layout pass
    /// (`Scene::ensure_layout`) measures the text and sets the real width
    /// before the table is ever drawn.
    ///
    /// There is deliberately no built-in "blank table" template any more: the
    /// columns a new table starts with are chosen in the creation form on the
    /// JS side, so keeping a second default here could only drift from it.
    pub fn new(
        id: impl Into<String>,
        name: impl Into<String>,
        columns: Vec<Column>,
        x: f64,
        y: f64,
    ) -> Table {
        Table {
            id: id.into(),
            x,
            y,
            w: 0.0,
            name: name.into(),
            columns,
        }
    }

    /// Total height: header band plus every column row.
    pub fn height(&self) -> f64 {
        HEADER_H + self.columns.len() as f64 * ROW_H
    }

    /// Whether the world-space point falls within the table's bounds.
    pub fn contains(&self, x: f64, y: f64) -> bool {
        x >= self.x && x <= self.x + self.w && y >= self.y && y <= self.y + self.height()
    }

    /// Horizontal center, in world coordinates.
    pub fn center_x(&self) -> f64 {
        self.x + self.w * 0.5
    }

    /// Vertical center of a column row, in world coordinates.
    pub fn row_y(&self, col: usize) -> f64 {
        self.y + HEADER_H + col as f64 * ROW_H + ROW_H * 0.5
    }
}
