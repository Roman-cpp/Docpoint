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
pub struct Column {
    pub name: String,
    pub kind: ColKind,
}

/// Columns a freshly-created table starts with, as `(name, kind)` pairs.
/// This is the canonical "blank table" shape used by [`Table::from_template`].
pub const DEFAULT_COLUMNS: &[(&str, ColKind)] = &[
    ("id", ColKind::Pk),
    ("created_at", ColKind::Plain),
    ("updated_at", ColKind::Plain),
];

/// A single table node: header plus a stack of column rows. `w` is computed
/// once from the rendered text widths (see `Scene::ensure_layout`).
pub struct Table {
    pub x: f64,
    pub y: f64,
    pub w: f64,
    pub name: String,
    pub columns: Vec<Column>,
}

impl Table {
    /// Builds a blank table from [`DEFAULT_COLUMNS`] at the given top-left
    /// world position. Width is left at `0.0` as a placeholder — the layout
    /// pass (`Scene::ensure_layout`) measures the text and sets the real width
    /// before the table is ever drawn.
    pub fn from_template(name: impl Into<String>, x: f64, y: f64) -> Table {
        let columns = DEFAULT_COLUMNS
            .iter()
            .map(|&(name, kind)| Column {
                name: name.to_string(),
                kind,
            })
            .collect();
        Table {
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
