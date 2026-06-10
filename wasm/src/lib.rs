use wasm_bindgen::prelude::*;
use web_sys::CanvasRenderingContext2d;

mod domain;

use domain::relation::model::Relation;
use domain::table::model::{ColKind, Column, Table, HEADER_H};

// ---------------------------------------------------------------------------
// Rendering layout constants (in world / CSS pixels, before camera scaling).
// The table's intrinsic geometry (HEADER_H, ROW_H) lives in the table model.
// ---------------------------------------------------------------------------
const PAD_X: f64 = 14.0;
const ICON_W: f64 = 20.0;
const TEXT_GAP: f64 = 6.0;
const MIN_TABLE_W: f64 = 170.0;
const CORNER_R: f64 = 8.0;

// Light theme palette — mirrors the app's design tokens (tokens.css):
// warm cream canvas, white surfaces, earthy accents.
const COL_BG: &str = "#faf7f2"; // --bg
const COL_GRID: &str = "#e2dccf"; // subtle warm dot, between --border and --border-h
const COL_TABLE_BG: &str = "#ffffff"; // --surface
const COL_HEADER_BG: &str = "#f0ede8"; // --cat-bg
const COL_BORDER: &str = "#e8e2d9"; // --border
const COL_BORDER_SEL: &str = "#3a5a78"; // --blue
const COL_TEXT: &str = "#1a1a1a"; // --ink
const COL_TEXT_HEAD: &str = "#1a1a1a"; // --ink
const COL_TEXT_DIM: &str = "#888888"; // --ink-low
const COL_KEY: &str = "#3f6b4a"; // --green
const COL_REL: &str = "#c8c0b4"; // --border-h
const COL_SHADOW: &str = "rgba(0, 0, 0, 0.08)"; // --shadow-sm tone

// Font stacks mirroring --font-serif / --font-mono in tokens.css.
const FONT_HEAD: &str = "600 14px \"Lora\", Georgia, \"Times New Roman\", serif";
const FONT_ROW: &str = "13px \"Menlo\", \"SF Mono\", \"Courier New\", monospace";

/// An in-progress table drag: which table and the cursor offset from its
/// top-left corner, in world coordinates.
struct DragState {
    index: usize,
    offset_x: f64,
    offset_y: f64,
}

/// An in-progress canvas pan: the screen position where the drag began and the
/// camera offset at that moment.
struct PanState {
    start_x: f64,
    start_y: f64,
    cam_x: f64,
    cam_y: f64,
}

/// The whole diagram. All hit-testing, camera math, drag/pan state and
/// rendering live here; the JS side only forwards CSS-pixel pointer
/// coordinates and viewport size.
#[wasm_bindgen]
pub struct Scene {
    tables: Vec<Table>,
    relations: Vec<Relation>,
    // Viewport in CSS pixels and the backing-store device-pixel ratio.
    width: f64,
    height: f64,
    dpr: f64,
    // Camera: world = (screen - cam) / scale.
    cam_x: f64,
    cam_y: f64,
    scale: f64,
    drag: Option<DragState>,
    pan: Option<PanState>,
    selected: Option<usize>,
    laid_out: bool,
}

#[wasm_bindgen]
impl Scene {
    /// Creates a scene pre-populated with a sample database schema so there is
    /// something to look at immediately.
    #[wasm_bindgen(constructor)]
    pub fn new() -> Scene {
        let mut scene = Scene {
            tables: Vec::new(),
            relations: Vec::new(),
            width: 800.0,
            height: 600.0,
            dpr: 1.0,
            cam_x: 0.0,
            cam_y: 0.0,
            scale: 1.0,
            drag: None,
            pan: None,
            selected: None,
            laid_out: false,
        };
        scene.seed_sample();
        scene
    }

    /// Updates the viewport size (CSS pixels) and backing-store ratio. Called
    /// on mount and whenever the canvas is resized.
    pub fn resize(&mut self, width: f64, height: f64, dpr: f64) {
        self.width = width;
        self.height = height;
        self.dpr = dpr;
    }

    /// Index of the currently selected table, or `-1` if none.
    pub fn selected_index(&self) -> i32 {
        self.selected.map_or(-1, |i| i as i32)
    }

    /// Number of tables in the scene.
    pub fn table_count(&self) -> usize {
        self.tables.len()
    }

    /// Appends a new table built from the default template, centered in the
    /// current viewport, and selects it. Flags the layout dirty so the next
    /// render measures the new table's text and fits its width.
    pub fn add_table(&mut self) {
        let (wx, wy) = self.screen_to_world(self.width * 0.5, self.height * 0.5);
        let name = format!("new_table_{}", self.tables.len() + 1);
        let table = Table::from_template(name, wx - MIN_TABLE_W * 0.5, wy - HEADER_H);
        self.tables.push(table);
        self.selected = Some(self.tables.len() - 1);
        self.laid_out = false;
    }

    fn screen_to_world(&self, x: f64, y: f64) -> (f64, f64) {
        ((x - self.cam_x) / self.scale, (y - self.cam_y) / self.scale)
    }

    /// Begins dragging the topmost table under the cursor, or starts a canvas
    /// pan over empty space. Coordinates are CSS pixels. Returns `true` when a
    /// table was grabbed.
    pub fn on_mouse_down(&mut self, x: f64, y: f64) -> bool {
        let (wx, wy) = self.screen_to_world(x, y);

        let hit = self.tables.iter().rposition(|t| t.contains(wx, wy));
        match hit {
            Some(index) => {
                let t = &self.tables[index];
                self.drag = Some(DragState {
                    index,
                    offset_x: wx - t.x,
                    offset_y: wy - t.y,
                });
                self.selected = Some(index);
                true
            }
            None => {
                self.selected = None;
                self.pan = Some(PanState {
                    start_x: x,
                    start_y: y,
                    cam_x: self.cam_x,
                    cam_y: self.cam_y,
                });
                false
            }
        }
    }

    /// Updates an in-progress table drag or canvas pan. Returns `true` when
    /// something moved and a redraw is needed.
    pub fn on_mouse_move(&mut self, x: f64, y: f64) -> bool {
        if let Some(drag) = &self.drag {
            let (wx, wy) = self.screen_to_world(x, y);
            if let Some(t) = self.tables.get_mut(drag.index) {
                t.x = wx - drag.offset_x;
                t.y = wy - drag.offset_y;
                return true;
            }
        }

        if let Some(pan) = &self.pan {
            self.cam_x = pan.cam_x + (x - pan.start_x);
            self.cam_y = pan.cam_y + (y - pan.start_y);
            return true;
        }

        false
    }

    /// Ends any in-progress drag or pan.
    pub fn on_mouse_up(&mut self) {
        self.drag = None;
        self.pan = None;
    }

    /// Whether the cursor is over any table (used by JS to pick the cursor).
    pub fn contains(&self, x: f64, y: f64) -> bool {
        let (wx, wy) = self.screen_to_world(x, y);
        self.tables.iter().any(|t| t.contains(wx, wy))
    }

    /// Whether a table drag or pan is currently active.
    pub fn is_interacting(&self) -> bool {
        self.drag.is_some() || self.pan.is_some()
    }

    /// Zooms toward the cursor by `factor`, keeping the world point under the
    /// cursor fixed on screen. Coordinates are CSS pixels.
    pub fn zoom(&mut self, x: f64, y: f64, factor: f64) {
        let (wx, wy) = self.screen_to_world(x, y);
        self.scale = (self.scale * factor).clamp(0.25, 2.5);
        self.cam_x = x - wx * self.scale;
        self.cam_y = y - wy * self.scale;
    }

    // -----------------------------------------------------------------------
    // Rendering
    // -----------------------------------------------------------------------

    /// Clears and redraws the whole scene: grid, relations, then tables.
    pub fn render(&mut self, ctx: &CanvasRenderingContext2d) {
        self.ensure_layout(ctx);

        // Reset to the identity transform so we can clear the full backing
        // store, then fold in the device-pixel ratio and camera.
        let _ = ctx.set_transform(1.0, 0.0, 0.0, 1.0, 0.0, 0.0);
        ctx.set_fill_style_str(COL_BG);
        ctx.fill_rect(0.0, 0.0, self.width * self.dpr, self.height * self.dpr);

        ctx.scale(self.dpr, self.dpr).ok();
        ctx.translate(self.cam_x, self.cam_y).ok();
        ctx.scale(self.scale, self.scale).ok();

        self.draw_grid(ctx);
        self.draw_relations(ctx);
        for (i, table) in self.tables.iter().enumerate() {
            draw_table(ctx, table, self.selected == Some(i));
        }
    }

    /// Computes each table's width from its text, once. Mutates `w` in place.
    fn ensure_layout(&mut self, ctx: &CanvasRenderingContext2d) {
        if self.laid_out {
            return;
        }
        for table in &mut self.tables {
            ctx.set_font(FONT_HEAD);
            let mut max = measure(ctx, &table.name);
            ctx.set_font(FONT_ROW);
            for col in &table.columns {
                max = max.max(measure(ctx, &col.name));
            }
            table.w = (PAD_X + ICON_W + TEXT_GAP + max + PAD_X).max(MIN_TABLE_W);
        }
        self.laid_out = true;
    }

    /// Dotted background grid, drawn across the visible world region.
    fn draw_grid(&self, ctx: &CanvasRenderingContext2d) {
        const STEP: f64 = 28.0;
        let left = -self.cam_x / self.scale;
        let top = -self.cam_y / self.scale;
        let right = (self.width - self.cam_x) / self.scale;
        let bottom = (self.height - self.cam_y) / self.scale;

        let start_x = (left / STEP).floor() * STEP;
        let start_y = (top / STEP).floor() * STEP;

        ctx.set_fill_style_str(COL_GRID);
        let mut gx = start_x;
        while gx < right {
            let mut gy = start_y;
            while gy < bottom {
                ctx.fill_rect(gx, gy, 1.5, 1.5);
                gy += STEP;
            }
            gx += STEP;
        }
    }

    /// Draws every relation as a bezier curve with crow's-foot endpoints.
    fn draw_relations(&self, ctx: &CanvasRenderingContext2d) {
        ctx.set_stroke_style_str(COL_REL);
        ctx.set_line_width(1.5);

        for rel in &self.relations {
            let (Some(src), Some(dst)) = (
                self.tables.get(rel.from.0),
                self.tables.get(rel.to.0),
            ) else {
                continue;
            };

            // Anchor each end on the side facing the other table.
            let src_right = src.center_x() <= dst.center_x();
            let dst_right = !src_right;

            let ax = if src_right { src.x + src.w } else { src.x };
            let ay = src.row_y(rel.from.1);
            let bx = if dst_right { dst.x + dst.w } else { dst.x };
            let by = dst.row_y(rel.to.1);

            let dx = ((bx - ax).abs() * 0.5).max(40.0);
            let c1x = ax + if src_right { dx } else { -dx };
            let c2x = bx + if dst_right { dx } else { -dx };

            ctx.begin_path();
            ctx.move_to(ax, ay);
            ctx.bezier_curve_to(c1x, ay, c2x, by, bx, by);
            ctx.stroke();

            draw_one(ctx, ax, ay, src_right);
            draw_many(ctx, bx, by, dst_right);
        }
    }
}

impl Default for Scene {
    fn default() -> Self {
        Self::new()
    }
}

// ---------------------------------------------------------------------------
// Free drawing helpers (no `&self` borrow, so they compose freely in loops).
// ---------------------------------------------------------------------------

fn measure(ctx: &CanvasRenderingContext2d, text: &str) -> f64 {
    ctx.measure_text(text).map(|m| m.width()).unwrap_or(0.0)
}

/// Traces a rounded rectangle path (does not stroke or fill).
fn rounded_rect(ctx: &CanvasRenderingContext2d, x: f64, y: f64, w: f64, h: f64, r: f64) {
    ctx.begin_path();
    ctx.move_to(x + r, y);
    let _ = ctx.arc_to(x + w, y, x + w, y + h, r);
    let _ = ctx.arc_to(x + w, y + h, x, y + h, r);
    let _ = ctx.arc_to(x, y + h, x, y, r);
    let _ = ctx.arc_to(x, y, x + w, y, r);
    ctx.close_path();
}

/// Traces a rectangle path rounded only on the top two corners.
fn rounded_top(ctx: &CanvasRenderingContext2d, x: f64, y: f64, w: f64, h: f64, r: f64) {
    ctx.begin_path();
    ctx.move_to(x, y + h);
    ctx.line_to(x, y + r);
    let _ = ctx.arc_to(x, y, x + r, y, r);
    ctx.line_to(x + w - r, y);
    let _ = ctx.arc_to(x + w, y, x + w, y + r, r);
    ctx.line_to(x + w, y + h);
    ctx.close_path();
}

fn draw_table(ctx: &CanvasRenderingContext2d, t: &Table, selected: bool) {
    let h = t.height();

    // Body — drawn with a soft drop shadow so surfaces read as cards on the
    // light canvas (mirrors --shadow-sm). The shadow is cleared immediately
    // afterwards so nothing else inherits it.
    ctx.set_shadow_color(COL_SHADOW);
    ctx.set_shadow_blur(12.0);
    ctx.set_shadow_offset_x(0.0);
    ctx.set_shadow_offset_y(3.0);
    rounded_rect(ctx, t.x, t.y, t.w, h, CORNER_R);
    ctx.set_fill_style_str(COL_TABLE_BG);
    ctx.fill();
    ctx.set_shadow_color("rgba(0, 0, 0, 0)");
    ctx.set_shadow_blur(0.0);
    ctx.set_shadow_offset_y(0.0);

    // Header band.
    rounded_top(ctx, t.x, t.y, t.w, HEADER_H, CORNER_R);
    ctx.set_fill_style_str(COL_HEADER_BG);
    ctx.fill();

    // Header: table glyph + name.
    draw_table_glyph(ctx, t.x + PAD_X + ICON_W * 0.5, t.y + HEADER_H * 0.5);
    ctx.set_font(FONT_HEAD);
    ctx.set_text_baseline("middle");
    ctx.set_text_align("left");
    ctx.set_fill_style_str(COL_TEXT_HEAD);
    let _ = ctx.fill_text(
        &t.name,
        t.x + PAD_X + ICON_W + TEXT_GAP,
        t.y + HEADER_H * 0.5 + 1.0,
    );

    // Column rows.
    ctx.set_font(FONT_ROW);
    for (i, col) in t.columns.iter().enumerate() {
        let cy = t.row_y(i);
        let icon_cx = t.x + PAD_X + ICON_W * 0.5;
        draw_col_icon(ctx, col.kind, icon_cx, cy);

        ctx.set_fill_style_str(match col.kind {
            ColKind::Nullable => COL_TEXT_DIM,
            _ => COL_TEXT,
        });
        let _ = ctx.fill_text(&col.name, t.x + PAD_X + ICON_W + TEXT_GAP, cy + 1.0);
    }

    // Border (drawn last so it sits on top of the fills).
    rounded_rect(ctx, t.x, t.y, t.w, h, CORNER_R);
    ctx.set_stroke_style_str(if selected { COL_BORDER_SEL } else { COL_BORDER });
    ctx.set_line_width(if selected { 2.0 } else { 1.0 });
    ctx.stroke();
}

/// A small "table" glyph for the header: an outlined box with a top stripe.
fn draw_table_glyph(ctx: &CanvasRenderingContext2d, cx: f64, cy: f64) {
    ctx.set_stroke_style_str(COL_TEXT_DIM);
    ctx.set_line_width(1.2);
    ctx.stroke_rect(cx - 6.0, cy - 6.0, 12.0, 12.0);
    ctx.begin_path();
    ctx.move_to(cx - 6.0, cy - 1.5);
    ctx.line_to(cx + 6.0, cy - 1.5);
    ctx.stroke();
}

fn draw_col_icon(ctx: &CanvasRenderingContext2d, kind: ColKind, cx: f64, cy: f64) {
    match kind {
        ColKind::Pk => draw_key(ctx, cx, cy),
        ColKind::Fk => draw_link(ctx, cx, cy),
        ColKind::Plain => draw_diamond(ctx, cx, cy, true),
        ColKind::Nullable => draw_diamond(ctx, cx, cy, false),
    }
}

fn draw_diamond(ctx: &CanvasRenderingContext2d, cx: f64, cy: f64, filled: bool) {
    let r = 4.0;
    ctx.begin_path();
    ctx.move_to(cx, cy - r);
    ctx.line_to(cx + r, cy);
    ctx.line_to(cx, cy + r);
    ctx.line_to(cx - r, cy);
    ctx.close_path();
    if filled {
        ctx.set_fill_style_str(COL_TEXT_DIM);
        ctx.fill();
    } else {
        ctx.set_stroke_style_str(COL_TEXT_DIM);
        ctx.set_line_width(1.2);
        ctx.stroke();
    }
}

fn draw_key(ctx: &CanvasRenderingContext2d, cx: f64, cy: f64) {
    ctx.set_stroke_style_str(COL_KEY);
    ctx.set_line_width(1.4);
    // Ring.
    ctx.begin_path();
    let _ = ctx.arc(cx - 2.5, cy, 3.0, 0.0, std::f64::consts::PI * 2.0);
    ctx.stroke();
    // Shaft with a tooth.
    ctx.begin_path();
    ctx.move_to(cx + 0.4, cy);
    ctx.line_to(cx + 5.5, cy);
    ctx.move_to(cx + 5.5, cy);
    ctx.line_to(cx + 5.5, cy + 3.0);
    ctx.stroke();
}

fn draw_link(ctx: &CanvasRenderingContext2d, cx: f64, cy: f64) {
    ctx.set_stroke_style_str(COL_KEY);
    ctx.set_line_width(1.4);
    ctx.begin_path();
    let _ = ctx.arc(cx - 2.0, cy, 2.6, 0.0, std::f64::consts::PI * 2.0);
    ctx.stroke();
    ctx.begin_path();
    let _ = ctx.arc(cx + 2.0, cy, 2.6, 0.0, std::f64::consts::PI * 2.0);
    ctx.stroke();
}

/// The "one" endpoint: a single perpendicular bar set a little off the table.
fn draw_one(ctx: &CanvasRenderingContext2d, ax: f64, ay: f64, out_right: bool) {
    let d = if out_right { 12.0 } else { -12.0 };
    let bx = ax + d;
    ctx.begin_path();
    ctx.move_to(bx, ay - 6.0);
    ctx.line_to(bx, ay + 6.0);
    ctx.stroke();
}

/// The "many" endpoint: a crow's foot whose prongs touch the table edge and
/// converge to a point set off the table.
fn draw_many(ctx: &CanvasRenderingContext2d, ax: f64, ay: f64, out_right: bool) {
    let d = if out_right { 14.0 } else { -14.0 };
    let bx = ax + d;
    ctx.begin_path();
    ctx.move_to(bx, ay);
    ctx.line_to(ax, ay - 6.0);
    ctx.move_to(bx, ay);
    ctx.line_to(ax, ay);
    ctx.move_to(bx, ay);
    ctx.line_to(ax, ay + 6.0);
    ctx.stroke();
}

// ---------------------------------------------------------------------------
// Sample data resembling the reference screenshot.
// ---------------------------------------------------------------------------

impl Scene {
    fn seed_sample(&mut self) {
        use ColKind::*;

        fn col(name: &str, kind: ColKind) -> Column {
            Column {
                name: name.to_string(),
                kind,
            }
        }

        self.tables = vec![
            Table {
                x: 60.0,
                y: 60.0,
                w: MIN_TABLE_W,
                name: "accounts".into(),
                columns: vec![
                    col("id", Pk),
                    col("archived_at", Nullable),
                    col("created_at", Plain),
                    col("locale", Plain),
                    col("name", Plain),
                    col("timezone", Plain),
                    col("updated_at", Plain),
                    col("uuid", Plain),
                ],
            },
            Table {
                x: 420.0,
                y: 60.0,
                w: MIN_TABLE_W,
                name: "account_accesses".into(),
                columns: vec![
                    col("id", Pk),
                    col("account_id", Fk),
                    col("created_at", Plain),
                    col("updated_at", Plain),
                    col("user_id", Fk),
                ],
            },
            Table {
                x: 780.0,
                y: 40.0,
                w: MIN_TABLE_W,
                name: "email_messages".into(),
                columns: vec![
                    col("id", Pk),
                    col("account_id", Fk),
                    col("author_id", Fk),
                    col("body", Plain),
                    col("created_at", Plain),
                    col("sha1", Plain),
                    col("subject", Plain),
                    col("updated_at", Plain),
                    col("uuid", Plain),
                ],
            },
            Table {
                x: 420.0,
                y: 320.0,
                w: MIN_TABLE_W,
                name: "account_configs".into(),
                columns: vec![
                    col("id", Pk),
                    col("account_id", Fk),
                    col("created_at", Plain),
                    col("key", Plain),
                    col("updated_at", Plain),
                    col("value", Plain),
                ],
            },
            Table {
                x: 60.0,
                y: 400.0,
                w: MIN_TABLE_W,
                name: "oauth_applications".into(),
                columns: vec![
                    col("id", Pk),
                    col("confidential", Plain),
                    col("created_at", Plain),
                    col("name", Plain),
                    col("redirect_uri", Nullable),
                    col("scopes", Plain),
                ],
            },
            Table {
                x: 780.0,
                y: 440.0,
                w: MIN_TABLE_W,
                name: "access_tokens".into(),
                columns: vec![
                    col("id", Pk),
                    col("created_at", Plain),
                    col("sha256", Plain),
                    col("token", Plain),
                    col("updated_at", Plain),
                ],
            },
        ];

        // (table_index, column_index) pairs: primary-key side -> foreign-key side.
        self.relations = vec![
            Relation {
                from: (0, 0),
                to: (1, 1),
            }, // accounts.id -> account_accesses.account_id
            Relation {
                from: (0, 0),
                to: (2, 1),
            }, // accounts.id -> email_messages.account_id
            Relation {
                from: (0, 0),
                to: (3, 1),
            }, // accounts.id -> account_configs.account_id
            Relation {
                from: (1, 0),
                to: (2, 2),
            }, // account_accesses.id -> email_messages.author_id
            Relation {
                from: (4, 0),
                to: (5, 0),
            }, // oauth_applications.id -> access_tokens.id
        ];
    }
}
