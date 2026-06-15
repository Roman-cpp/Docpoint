use wasm_bindgen::prelude::*;
use web_sys::CanvasRenderingContext2d;

mod domain;

use domain::relation::model::{Endpoint, Relation};
use domain::table::model::{ColKind, Column, Table, HEADER_H, ROW_H};

const TAU: f64 = std::f64::consts::PI * 2.0;

// ---------------------------------------------------------------------------
// Rendering layout constants (in world / CSS pixels, before camera scaling).
// The table's intrinsic geometry (HEADER_H, ROW_H) lives in the table model.
// ---------------------------------------------------------------------------
const PAD_X: f64 = 14.0;
const ICON_W: f64 = 20.0;
const TEXT_GAP: f64 = 6.0;
const MIN_TABLE_W: f64 = 170.0;
const CORNER_R: f64 = 8.0;
const PORT_R: f64 = 4.0; // visible connection-port radius
const PORT_HIT: f64 = 8.0; // grab tolerance around a port, in world px
const REL_HIT: f64 = 6.0; // click tolerance around a relation curve, in screen px
const BADGE_R: f64 = 9.0; // delete-badge radius on a selected relation

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
const COL_REL_SEL: &str = "#3a5a78"; // --blue, selected relation
const COL_DELETE: &str = "#9b3b36"; // --red, delete badge
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

/// An in-progress relation drag started from a column port: the source endpoint,
/// which side of the table the port sits on, and the live cursor position in
/// world coordinates (drives the preview curve).
struct LinkState {
    from: Endpoint,
    from_right: bool,
    cursor: (f64, f64),
}

/// The resolved cubic-bezier geometry of a relation, in world coordinates.
/// The two control points share the y of their anchor (`c1.y == ay`,
/// `c2.y == by`), so only their x is stored.
struct Curve {
    ax: f64,
    ay: f64,
    c1x: f64,
    c2x: f64,
    bx: f64,
    by: f64,
    src_right: bool,
    dst_right: bool,
}

impl Curve {
    /// Point on the curve at parameter `t` in `[0, 1]`.
    fn point(&self, t: f64) -> (f64, f64) {
        let mt = 1.0 - t;
        let (a, b, c, d) = (mt * mt * mt, 3.0 * mt * mt * t, 3.0 * mt * t * t, t * t * t);
        let x = a * self.ax + b * self.c1x + c * self.c2x + d * self.bx;
        // Control-point y's equal their anchor y's.
        let y = a * self.ay + b * self.ay + c * self.by + d * self.by;
        (x, y)
    }
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
    link: Option<LinkState>,
    selected: Option<usize>,
    selected_rel: Option<usize>,
    // The column row whose ports are currently revealed (cursor hovering it).
    hover_col: Option<Endpoint>,
    // Desired CSS cursor for the current pointer state; read by JS.
    cursor: String,
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
            link: None,
            selected: None,
            selected_rel: None,
            hover_col: None,
            cursor: "default".to_string(),
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

    /// The CSS cursor name matching the current pointer state. Read by JS after
    /// every pointer event.
    pub fn cursor(&self) -> String {
        self.cursor.clone()
    }

    /// Routes a left-button press, in priority order: delete a selected
    /// relation via its badge, start a relation drag from a column port, select
    /// a relation curve, drag a table, or pan empty space. Coordinates are CSS
    /// pixels.
    pub fn on_mouse_down(&mut self, x: f64, y: f64) -> bool {
        let (wx, wy) = self.screen_to_world(x, y);

        // 1. The delete badge of the currently selected relation.
        if let Some(ri) = self.selected_rel {
            if self.over_delete_badge(ri, wx, wy) {
                self.relations.remove(ri);
                self.selected_rel = None;
                self.cursor = "default".to_string();
                return false;
            }
        }

        // 2. A column port — start drawing a new relation.
        if let Some((ti, ci, right)) = self.hit_port(wx, wy) {
            self.selected = None;
            self.selected_rel = None;
            self.link = Some(LinkState {
                from: (ti, ci),
                from_right: right,
                cursor: (wx, wy),
            });
            self.cursor = "crosshair".to_string();
            return false;
        }

        // 3. A relation curve — select it.
        if let Some(ri) = self.hit_relation(wx, wy) {
            self.selected = None;
            self.selected_rel = Some(ri);
            self.cursor = "pointer".to_string();
            return false;
        }

        // 4. A table body — drag it.
        if let Some(index) = self.tables.iter().rposition(|t| t.contains(wx, wy)) {
            let t = &self.tables[index];
            self.drag = Some(DragState {
                index,
                offset_x: wx - t.x,
                offset_y: wy - t.y,
            });
            self.selected = Some(index);
            self.selected_rel = None;
            self.cursor = "grabbing".to_string();
            return true;
        }

        // 5. Empty space — pan.
        self.selected = None;
        self.selected_rel = None;
        self.pan = Some(PanState {
            start_x: x,
            start_y: y,
            cam_x: self.cam_x,
            cam_y: self.cam_y,
        });
        self.cursor = "grabbing".to_string();
        false
    }

    /// Updates whatever interaction is live (table drag, relation drag, pan) or,
    /// when idle, refreshes hover state and the cursor. Returns `true` when a
    /// redraw is needed.
    pub fn on_mouse_move(&mut self, x: f64, y: f64) -> bool {
        let (wx, wy) = self.screen_to_world(x, y);

        if let Some(drag) = &self.drag {
            if let Some(t) = self.tables.get_mut(drag.index) {
                t.x = wx - drag.offset_x;
                t.y = wy - drag.offset_y;
            }
            self.cursor = "grabbing".to_string();
            return true;
        }

        if self.link.is_some() {
            // Reveal the prospective target row's ports while dragging.
            let target = self.hit_row(wx, wy);
            if let Some(link) = self.link.as_mut() {
                link.cursor = (wx, wy);
            }
            self.hover_col = target;
            self.cursor = "crosshair".to_string();
            return true;
        }

        if let Some(pan) = &self.pan {
            self.cam_x = pan.cam_x + (x - pan.start_x);
            self.cam_y = pan.cam_y + (y - pan.start_y);
            self.cursor = "grabbing".to_string();
            return true;
        }

        // Idle hover: ports follow the row under the cursor; pick a cursor.
        let prev = self.hover_col;
        self.hover_col = self.hit_row(wx, wy);

        let over_badge = self
            .selected_rel
            .is_some_and(|ri| self.over_delete_badge(ri, wx, wy));

        self.cursor = if over_badge {
            "pointer"
        } else if self.hit_port(wx, wy).is_some() {
            "crosshair"
        } else if self.hit_relation(wx, wy).is_some() {
            "pointer"
        } else if self.tables.iter().any(|t| t.contains(wx, wy)) {
            "grab"
        } else {
            "default"
        }
        .to_string();

        prev != self.hover_col
    }

    /// Ends any interaction. A relation drag dropped on a column row of a
    /// different table creates a new relation. Returns `true` when a redraw is
    /// needed.
    pub fn on_mouse_up(&mut self, x: f64, y: f64) -> bool {
        let mut dirty = false;

        if let Some(link) = self.link.take() {
            let (wx, wy) = self.screen_to_world(x, y);
            if let Some((ti, ci)) = self.hit_row(wx, wy) {
                let to: Endpoint = (ti, ci);
                let valid = ti != link.from.0
                    && !self.relations.iter().any(|r| r.connects(link.from, to));
                if valid {
                    self.relations.push(Relation::new(link.from, to));
                    self.selected_rel = Some(self.relations.len() - 1);
                }
            }
            dirty = true;
        }

        self.drag = None;
        self.pan = None;
        dirty
    }

    /// Whether a table drag, relation drag, or pan is currently active.
    pub fn is_interacting(&self) -> bool {
        self.drag.is_some() || self.pan.is_some() || self.link.is_some()
    }

    // -----------------------------------------------------------------------
    // Hit-testing
    // -----------------------------------------------------------------------

    /// The `(table, column)` row at a world point, if the point is over a
    /// column row (not the header) of some table. Topmost table wins.
    fn hit_row(&self, wx: f64, wy: f64) -> Option<Endpoint> {
        for (ti, t) in self.tables.iter().enumerate().rev() {
            if !t.contains(wx, wy) || wy < t.y + HEADER_H {
                continue;
            }
            let idx = ((wy - t.y - HEADER_H) / ROW_H).floor() as usize;
            if idx < t.columns.len() {
                return Some((ti, idx));
            }
            return None;
        }
        None
    }

    /// The column port near a world point: `(table, column, on_right_edge)`.
    /// Ports sit at each row's vertical center on the left and right edges.
    fn hit_port(&self, wx: f64, wy: f64) -> Option<(usize, usize, bool)> {
        for (ti, t) in self.tables.iter().enumerate().rev() {
            for ci in 0..t.columns.len() {
                let cy = t.row_y(ci);
                for (right, px) in [(false, t.x), (true, t.x + t.w)] {
                    if (wx - px).powi(2) + (wy - cy).powi(2) <= PORT_HIT * PORT_HIT {
                        return Some((ti, ci, right));
                    }
                }
            }
        }
        None
    }

    /// Index of the relation whose curve passes near a world point.
    fn hit_relation(&self, wx: f64, wy: f64) -> Option<usize> {
        // Tolerance is a screen distance, so widen it as the scene zooms out.
        let tol = (REL_HIT / self.scale).max(REL_HIT);
        for (i, rel) in self.relations.iter().enumerate() {
            let Some(c) = self.rel_curve(rel) else {
                continue;
            };
            const N: usize = 24;
            let mut prev = c.point(0.0);
            for k in 1..=N {
                let p = c.point(k as f64 / N as f64);
                if dist_to_segment(wx, wy, prev, p) <= tol {
                    return Some(i);
                }
                prev = p;
            }
        }
        None
    }

    /// Whether a world point falls on relation `ri`'s delete badge (its curve
    /// midpoint).
    fn over_delete_badge(&self, ri: usize, wx: f64, wy: f64) -> bool {
        self.relations
            .get(ri)
            .and_then(|rel| self.rel_curve(rel))
            .map(|c| c.point(0.5))
            .is_some_and(|(mx, my)| (wx - mx).powi(2) + (wy - my).powi(2) <= BADGE_R * BADGE_R)
    }

    /// Resolves a relation's bezier geometry from the current table positions.
    fn rel_curve(&self, rel: &Relation) -> Option<Curve> {
        let src = self.tables.get(rel.from.0)?;
        let dst = self.tables.get(rel.to.0)?;
        if rel.from.1 >= src.columns.len() || rel.to.1 >= dst.columns.len() {
            return None;
        }

        let src_right = src.center_x() <= dst.center_x();
        let dst_right = !src_right;
        let ax = if src_right { src.x + src.w } else { src.x };
        let ay = src.row_y(rel.from.1);
        let bx = if dst_right { dst.x + dst.w } else { dst.x };
        let by = dst.row_y(rel.to.1);
        let dx = ((bx - ax).abs() * 0.5).max(40.0);
        let c1x = ax + if src_right { dx } else { -dx };
        let c2x = bx + if dst_right { dx } else { -dx };

        Some(Curve {
            ax,
            ay,
            c1x,
            c2x,
            bx,
            by,
            src_right,
            dst_right,
        })
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
        // Editing overlays sit above the tables.
        self.draw_ports(ctx);
        self.draw_link_preview(ctx);
        self.draw_delete_badge(ctx);
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

    /// Draws every relation as a bezier curve with crow's-foot endpoints. The
    /// selected relation is highlighted in the accent color.
    fn draw_relations(&self, ctx: &CanvasRenderingContext2d) {
        for (i, rel) in self.relations.iter().enumerate() {
            let Some(c) = self.rel_curve(rel) else {
                continue;
            };
            let selected = self.selected_rel == Some(i);
            ctx.set_stroke_style_str(if selected { COL_REL_SEL } else { COL_REL });
            ctx.set_line_width(if selected { 2.0 } else { 1.5 });

            ctx.begin_path();
            ctx.move_to(c.ax, c.ay);
            ctx.bezier_curve_to(c.c1x, c.ay, c.c2x, c.by, c.bx, c.by);
            ctx.stroke();

            draw_one(ctx, c.ax, c.ay, c.src_right);
            draw_many(ctx, c.bx, c.by, c.dst_right);
        }
    }

    /// Reveals the connection ports (left + right) on the hovered column row.
    fn draw_ports(&self, ctx: &CanvasRenderingContext2d) {
        let Some((ti, ci)) = self.hover_col else {
            return;
        };
        let Some(t) = self.tables.get(ti) else {
            return;
        };
        let cy = t.row_y(ci);
        ctx.set_line_width(1.5);
        for px in [t.x, t.x + t.w] {
            ctx.begin_path();
            let _ = ctx.arc(px, cy, PORT_R, 0.0, TAU);
            ctx.set_fill_style_str(COL_TABLE_BG);
            ctx.fill();
            ctx.set_stroke_style_str(COL_REL_SEL);
            ctx.stroke();
        }
    }

    /// Draws the live preview curve while a relation is being dragged out.
    fn draw_link_preview(&self, ctx: &CanvasRenderingContext2d) {
        let Some(link) = &self.link else {
            return;
        };
        let Some(t) = self.tables.get(link.from.0) else {
            return;
        };
        let ax = if link.from_right { t.x + t.w } else { t.x };
        let ay = t.row_y(link.from.1);
        let (bx, by) = link.cursor;
        let dx = ((bx - ax).abs() * 0.5).max(40.0);
        let c1x = ax + if link.from_right { dx } else { -dx };

        ctx.set_stroke_style_str(COL_REL_SEL);
        ctx.set_line_width(1.8);
        ctx.begin_path();
        ctx.move_to(ax, ay);
        ctx.bezier_curve_to(c1x, ay, bx, by, bx, by);
        ctx.stroke();

        // Source anchor dot.
        ctx.begin_path();
        let _ = ctx.arc(ax, ay, PORT_R, 0.0, TAU);
        ctx.set_fill_style_str(COL_REL_SEL);
        ctx.fill();
    }

    /// Draws the round ✕ delete badge at the midpoint of the selected relation.
    fn draw_delete_badge(&self, ctx: &CanvasRenderingContext2d) {
        let Some(ri) = self.selected_rel else {
            return;
        };
        let Some((mx, my)) = self
            .relations
            .get(ri)
            .and_then(|rel| self.rel_curve(rel))
            .map(|c| c.point(0.5))
        else {
            return;
        };

        ctx.begin_path();
        let _ = ctx.arc(mx, my, BADGE_R, 0.0, TAU);
        ctx.set_fill_style_str(COL_TABLE_BG);
        ctx.fill();
        ctx.set_stroke_style_str(COL_DELETE);
        ctx.set_line_width(1.5);
        ctx.stroke();

        let d = 3.5;
        ctx.begin_path();
        ctx.move_to(mx - d, my - d);
        ctx.line_to(mx + d, my + d);
        ctx.move_to(mx + d, my - d);
        ctx.line_to(mx - d, my + d);
        ctx.set_line_width(1.6);
        ctx.stroke();
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

/// Shortest distance from point `(px, py)` to the segment `a`–`b`.
fn dist_to_segment(px: f64, py: f64, a: (f64, f64), b: (f64, f64)) -> f64 {
    let (ax, ay) = a;
    let (bx, by) = b;
    let (dx, dy) = (bx - ax, by - ay);
    let len_sq = dx * dx + dy * dy;
    let t = if len_sq <= f64::EPSILON {
        0.0
    } else {
        (((px - ax) * dx + (py - ay) * dy) / len_sq).clamp(0.0, 1.0)
    };
    let (cx, cy) = (ax + t * dx, ay + t * dy);
    ((px - cx).powi(2) + (py - cy).powi(2)).sqrt()
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
