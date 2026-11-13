use crate::Telemetry;
use crate::params::RattleParams;
use egui::{
    Align2, Color32, CornerRadius, FontId, Margin, Pos2, Rect, Response, Role, Sense, Shape,
    Stroke, Vec2, WidgetInfo,
};
use nice_plug::context::gui::GuiContext;
use nice_plug::editor::dpi::LogicalSize;
use nice_plug::prelude::*;
use nice_plug_egui::{
    EguiEditor, EguiEditorState, EguiNiceSettings, Frame, NiceEguiApp, RepaintNotifier,
    create_egui_editor,
};
use pod_rattle_engine::{Material, Snapshot};
use std::f32::consts::PI;
use std::sync::Arc;

const BG: Color32 = Color32::from_rgb(0x14, 0x11, 0x0f);
const HEADER: Color32 = Color32::from_rgb(0x0e, 0x0c, 0x0b);
const PANEL: Color32 = Color32::from_rgb(0x1e, 0x1a, 0x17);
const STAGE: Color32 = Color32::from_rgb(0x1a, 0x15, 0x12);
const FG: Color32 = Color32::from_rgb(0xef, 0xe6, 0xdc);
const MUTED: Color32 = Color32::from_rgb(0x8f, 0x82, 0x75);
const LINE: Color32 = Color32::from_rgb(0x33, 0x2b, 0x25);
const KNOB: Color32 = Color32::from_rgb(0x2a, 0x24, 0x20);
const TRACK: Color32 = Color32::from_rgb(0x3d, 0x34, 0x2d);
const POD: [f32; 3] = [142.0, 60.0, 42.0];
const BRASS: [f32; 3] = [201.0, 151.0, 58.0];
const JUTE: Color32 = Color32::from_rgb(0x8f, 0x7b, 0x58);
const ACCENT: Color32 = Color32::from_rgb(0xe0, 0x8a, 0x5a);
const FLASH: Color32 = Color32::from_rgb(0xf2, 0xc4, 0x6b);
const HEADER_HEIGHT: f32 = 48.0;
const RAIL_WIDTH: f32 = 420.0;
const GAP: f32 = 10.0;
const SECTION_TITLE: f32 = 26.0;
const CELL: Vec2 = Vec2::new(88.0, 82.0);
const KNOB_RADIUS: f32 = 19.0;
const SWEEP: f32 = 1.5 * PI;
const START_ANGLE: f32 = 0.75 * PI;
const DRAG_PIXELS: f32 = 180.0;
const FINE_DRAG: f32 = 0.1;
const DEPTH_PER_SCROLL: f32 = 0.0005;
pub const EDITOR_SIZE: LogicalSize<f32> = LogicalSize::new(960.0, 600.0);

#[derive(Default)]
struct EditorState {
    snapshot: Snapshot,
    grab: Option<Grab>,
    scrolling: bool,
}

struct Grab {
    pointer: Vec2,
    hand: Vec2,
}

struct View {
    rect: Rect,
    scale: f32,
    origin: Pos2,
}

impl View {
    fn new(rect: Rect) -> Self {
        let scale = (rect.height() * 3.1).min(rect.width() * 2.8);
        let origin = Pos2::new(rect.center().x, rect.top() + rect.height() * 0.3);
        Self {
            rect,
            scale,
            origin,
        }
    }

    fn project(&self, x: f32, y: f32, z: f32) -> Pos2 {
        Pos2::new(
            self.origin.x + x * self.scale,
            self.origin.y - y * self.scale - z * self.scale * 0.35,
        )
    }

    fn world(&self, p: Pos2) -> Vec2 {
        Vec2::new(
            (p.x - self.origin.x) / self.scale,
            (self.origin.y - p.y) / self.scale,
        )
    }
}

pub type RattleEditor = EguiEditor<App>;

pub struct EditorView {
    params: Arc<RattleParams>,
    telemetry: Arc<Telemetry>,
    state: EditorState,
}

impl EditorView {
    #[must_use]
    pub fn new(params: Arc<RattleParams>, telemetry: Arc<Telemetry>) -> Self {
        Self {
            params,
            telemetry,
            state: EditorState::default(),
        }
    }

    pub fn style(ctx: &egui::Context) {
        ctx.all_styles_mut(|style| {
            style.visuals = egui::Visuals::dark();
            style.visuals.panel_fill = BG;
            style.visuals.selection.bg_fill = ACCENT;
            style.visuals.selection.stroke = Stroke::new(1.0, HEADER);
            let widgets = &mut style.visuals.widgets;
            for state in [
                &mut widgets.inactive,
                &mut widgets.hovered,
                &mut widgets.active,
            ] {
                state.corner_radius = CornerRadius::same(4);
                state.bg_stroke = Stroke::new(1.0, LINE);
            }
            widgets.inactive.weak_bg_fill = KNOB;
            widgets.hovered.weak_bg_fill = TRACK;
            widgets.inactive.fg_stroke = Stroke::new(1.0, MUTED);
            widgets.hovered.fg_stroke = Stroke::new(1.0, FG);
        });
    }

    pub fn show(&mut self, ui: &mut egui::Ui, setter: &ParamSetter) {
        let (params, state) = (&self.params, &mut self.state);
        if let Ok(mut output) = self.telemetry.snapshot.lock() {
            state.snapshot = *output.read();
        }
        egui::Panel::top("header")
            .exact_size(HEADER_HEIGHT)
            .resizable(false)
            .frame(
                egui::Frame::new()
                    .fill(HEADER)
                    .inner_margin(Margin::symmetric(16, 0)),
            )
            .show(ui, |ui| header(ui, params, setter));
        egui::Panel::right("rail")
            .exact_size(RAIL_WIDTH)
            .resizable(false)
            .frame(egui::Frame::new().fill(BG).inner_margin(Margin::same(12)))
            .show(ui, |ui| rail(ui, params, setter));
        egui::CentralPanel::default()
            .frame(egui::Frame::new().fill(STAGE))
            .show(ui, |ui| stage(ui, params, setter, state));
    }
}

pub struct App {
    view: EditorView,
    gui: Option<GuiContext>,
}

impl NiceEguiApp for App {
    fn build(
        &mut self,
        egui_ctx: egui::Context,
        nice_gui_ctx: GuiContext,
        _frame: &mut Frame,
    ) -> Result<(), nice_plug_egui::baseview::HandlerError> {
        EditorView::style(&egui_ctx);
        self.gui = Some(nice_gui_ctx);
        Ok(())
    }

    fn editor_closed(&mut self) {
        self.gui = None;
    }

    fn ui(&mut self, ui: &mut egui::Ui, _frame: &mut Frame) {
        let Some(gui) = self.gui.as_ref() else {
            return;
        };
        self.view.show(ui, &gui.param_setter());
        ui.ctx().request_repaint();
    }
}

pub fn create(params: Arc<RattleParams>, telemetry: Arc<Telemetry>) -> Option<RattleEditor> {
    create_egui_editor(
        EguiEditorState::from_size(EDITOR_SIZE, 1.0),
        RepaintNotifier::new(),
        EguiNiceSettings::new(),
        App {
            view: EditorView::new(params, telemetry),
            gui: None,
        },
    )
}

fn header(ui: &mut egui::Ui, params: &RattleParams, setter: &ParamSetter) {
    ui.horizontal_centered(|ui| {
        ui.label(
            egui::RichText::new("POD RATTLE")
                .font(FontId::proportional(17.0))
                .strong()
                .color(FG),
        );
        ui.with_layout(egui::Layout::right_to_left(egui::Align::Center), |ui| {
            ui.spacing_mut().item_spacing.x = 4.0;
            for material in Material::ALL.iter().rev() {
                material_button(ui, params, setter, *material);
            }
        });
    });
}

fn material_button(
    ui: &mut egui::Ui,
    params: &RattleParams,
    setter: &ParamSetter,
    material: Material,
) {
    let fields = params.material_fields(material);
    let selected = fields
        .iter()
        .all(|(param, value)| (param.value() - value).abs() < 1e-3);
    let text = egui::RichText::new(format!("{material:?}"))
        .size(12.0)
        .color(if selected { HEADER } else { FG });
    let button = egui::Button::new(text)
        .selected(selected)
        .min_size(Vec2::new(68.0, 26.0));
    if ui.add(button).clicked() {
        for (param, value) in fields {
            setter.begin_set_parameter(param);
            setter.set_parameter(param, value);
            setter.end_set_parameter(param);
        }
    }
}

struct Section<'a> {
    rect: Rect,
    title: &'a str,
}

impl Section<'_> {
    fn cells(&self, ui: &mut egui::Ui, count: usize) -> impl Iterator<Item = Rect> + use<> {
        let painter = ui.painter();
        painter.rect(
            self.rect,
            CornerRadius::same(8),
            PANEL,
            Stroke::new(1.0, LINE),
            egui::StrokeKind::Inside,
        );
        painter.text(
            self.rect.left_top() + Vec2::new(12.0, 9.0),
            Align2::LEFT_TOP,
            self.title,
            FontId::proportional(10.0),
            MUTED,
        );
        let width = CELL.x * count as f32;
        let left = self.rect.center().x - width / 2.0;
        let top =
            self.rect.top() + SECTION_TITLE + (self.rect.height() - SECTION_TITLE - CELL.y) / 2.0;
        (0..count).map(move |i| Rect::from_min_size(Pos2::new(left + CELL.x * i as f32, top), CELL))
    }
}

fn place<R>(ui: &mut egui::Ui, rect: Rect, add: impl FnOnce(&mut egui::Ui) -> R) -> R {
    ui.scope_builder(egui::UiBuilder::new().max_rect(rect), add)
        .inner
}

fn rail(ui: &mut egui::Ui, params: &RattleParams, setter: &ParamSetter) {
    let area = ui.max_rect();
    let height = (area.height() - GAP * 3.0) / 4.0;
    let row = |i: usize| {
        Rect::from_min_size(
            area.left_top() + Vec2::new(0.0, (height + GAP) * i as f32),
            Vec2::new(area.width(), height),
        )
    };
    let tone = Section {
        rect: row(0),
        title: "TONE",
    };
    let cells: Vec<Rect> = tone.cells(ui, 4).collect();
    for (rect, param) in
        cells
            .into_iter()
            .zip([&params.material, &params.decay, &params.pitch, &params.rest])
    {
        place(ui, rect, |ui| knob(ui, param, setter));
    }
    let overtones = Section {
        rect: row(1),
        title: "OVERTONES",
    };
    let cells: Vec<Rect> = overtones.cells(ui, 4).collect();
    for (rect, param) in cells.into_iter().zip([
        &params.bright,
        &params.spread,
        &params.hi_decay,
        &params.hard,
    ]) {
        place(ui, rect, |ui| knob(ui, param, setter));
    }
    let shake = Section {
        rect: row(2),
        title: "SHAKE",
    };
    let cells: Vec<Rect> = shake.cells(ui, 3).collect();
    place(ui, cells[0], |ui| power(ui, &params.auto, setter));
    place(ui, cells[1], |ui| knob(ui, &params.rate, setter));
    place(ui, cells[2], |ui| knob(ui, &params.amp, setter));
    let bottom = row(3);
    let half = (bottom.width() - GAP) / 2.0;
    let shape = Section {
        rect: Rect::from_min_size(bottom.left_top(), Vec2::new(half, height)),
        title: "SHAPE",
    };
    let cells: Vec<Rect> = shape.cells(ui, 2).collect();
    place(ui, cells[0], |ui| knob(ui, &params.count, setter));
    place(ui, cells[1], |ui| knob(ui, &params.len, setter));
    let output = Section {
        rect: Rect::from_min_size(
            bottom.left_top() + Vec2::new(half + GAP, 0.0),
            Vec2::new(half, height),
        ),
        title: "OUTPUT",
    };
    let cells: Vec<Rect> = output.cells(ui, 1).collect();
    place(ui, cells[0], |ui| knob(ui, &params.gain, setter));
}

fn arc(center: Pos2, radius: f32, from: f32, to: f32) -> Vec<Pos2> {
    let steps = ((to - from).abs() / SWEEP * 48.0).ceil().max(2.0) as usize;
    (0..=steps)
        .map(|i| {
            let a = from + (to - from) * i as f32 / steps as f32;
            center + Vec2::new(a.cos(), a.sin()) * radius
        })
        .collect()
}

fn knob(ui: &mut egui::Ui, param: &impl Param, setter: &ParamSetter) -> Response {
    let (rect, response) = ui.allocate_exact_size(CELL, Sense::click_and_drag());
    let id = response.id;
    let normalized = param.unmodulated_normalized_value();

    if response.double_clicked() {
        setter.begin_set_parameter(param);
        setter.set_parameter_normalized(param, param.default_normalized_value());
        setter.end_set_parameter(param);
    } else if response.drag_started() {
        setter.begin_set_parameter(param);
        ui.data_mut(|d| d.insert_temp(id, normalized));
    }
    if response.dragged() {
        let fine = if ui.input(|i| i.modifiers.shift) {
            FINE_DRAG
        } else {
            1.0
        };
        let raw: f32 = ui.data(|d| d.get_temp(id)).unwrap_or(normalized);
        let next = (raw - response.drag_delta().y / DRAG_PIXELS * fine).clamp(0.0, 1.0);
        ui.data_mut(|d| d.insert_temp(id, next));
        if (next - normalized).abs() > f32::EPSILON {
            setter.set_parameter_normalized(param, next);
        }
    }
    if response.drag_stopped() {
        setter.end_set_parameter(param);
    }

    let value = param.unmodulated_normalized_value();
    let text = param.normalized_value_to_string(value, true);
    let name = param.name().to_owned();
    response.widget_info(|| WidgetInfo::slider(true, f64::from(value), &name));

    let painter = ui.painter();
    let active = response.hovered() || response.dragged();
    painter.text(
        Pos2::new(rect.center().x, rect.top() + 2.0),
        Align2::CENTER_TOP,
        &name,
        FontId::proportional(11.0),
        if active { FG } else { MUTED },
    );
    let center = Pos2::new(rect.center().x, rect.top() + 16.0 + KNOB_RADIUS + 3.0);
    let ring = KNOB_RADIUS + 4.0;
    painter.add(Shape::line(
        arc(center, ring, START_ANGLE, START_ANGLE + SWEEP),
        Stroke::new(3.0, TRACK),
    ));
    if value > 0.0 {
        painter.add(Shape::line(
            arc(center, ring, START_ANGLE, START_ANGLE + SWEEP * value),
            Stroke::new(3.0, ACCENT),
        ));
    }
    painter.circle(
        center,
        KNOB_RADIUS,
        KNOB,
        Stroke::new(1.0, if active { MUTED } else { LINE }),
    );
    let angle = START_ANGLE + SWEEP * value;
    let dir = Vec2::new(angle.cos(), angle.sin());
    painter.line_segment(
        [
            center + dir * KNOB_RADIUS * 0.35,
            center + dir * KNOB_RADIUS * 0.85,
        ],
        Stroke::new(2.0, FG),
    );
    painter.text(
        Pos2::new(rect.center().x, rect.bottom() - 2.0),
        Align2::CENTER_BOTTOM,
        text,
        FontId::monospace(11.0),
        FG,
    );
    response
}

fn power(ui: &mut egui::Ui, param: &BoolParam, setter: &ParamSetter) -> Response {
    let (rect, response) = ui.allocate_exact_size(CELL, Sense::click());
    let on = param.value();
    if response.clicked() {
        setter.begin_set_parameter(param);
        setter.set_parameter(param, !on);
        setter.end_set_parameter(param);
    }
    let on = param.value();
    let name = param.name().to_owned();
    response.widget_info(|| WidgetInfo::selected(Role::Switch, true, on, &name));

    let painter = ui.painter();
    painter.text(
        Pos2::new(rect.center().x, rect.top() + 2.0),
        Align2::CENTER_TOP,
        &name,
        FontId::proportional(11.0),
        if response.hovered() { FG } else { MUTED },
    );
    let center = Pos2::new(rect.center().x, rect.top() + 16.0 + KNOB_RADIUS + 3.0);
    if on {
        painter.circle_filled(center, KNOB_RADIUS + 5.0, ACCENT.gamma_multiply(0.18));
    }
    painter.circle(
        center,
        KNOB_RADIUS,
        if on { ACCENT } else { KNOB },
        Stroke::new(1.0, if on { ACCENT } else { LINE }),
    );
    let glyph = if on { HEADER } else { MUTED };
    painter.add(Shape::line(
        arc(center, 7.5, -0.5 * PI + 0.7, 1.5 * PI - 0.7),
        Stroke::new(2.0, glyph),
    ));
    painter.line_segment(
        [center - Vec2::new(0.0, 10.0), center - Vec2::new(0.0, 2.0)],
        Stroke::new(2.0, glyph),
    );
    response
}

fn stage(ui: &mut egui::Ui, params: &RattleParams, setter: &ParamSetter, state: &mut EditorState) {
    let (response, painter) = ui.allocate_painter(ui.available_size(), Sense::drag());
    let view = View::new(response.rect);
    let s = &state.snapshot;

    if response.drag_started() {
        if params.auto.value() {
            setter.begin_set_parameter(&params.auto);
            setter.set_parameter(&params.auto, false);
            setter.end_set_parameter(&params.auto);
        }
        if let Some(p) = response.interact_pointer_pos() {
            state.grab = Some(Grab {
                pointer: view.world(p),
                hand: Vec2::new(s.hand[0], s.hand[1]),
            });
            setter.begin_set_parameter(&params.hand_x);
            setter.begin_set_parameter(&params.hand_y);
        }
    }
    if let (Some(grab), Some(p)) = (&state.grab, response.interact_pointer_pos()) {
        let target = grab.hand + view.world(p) - grab.pointer;
        setter.set_parameter(&params.hand_x, target.x);
        setter.set_parameter(&params.hand_y, target.y);
    }
    if response.drag_stopped() && state.grab.take().is_some() {
        setter.end_set_parameter(&params.hand_x);
        setter.end_set_parameter(&params.hand_y);
    }

    let scroll = if response.hovered() {
        ui.input(|i| i.smooth_scroll_delta.y)
    } else {
        0.0
    };
    if scroll != 0.0 {
        if !state.scrolling {
            state.scrolling = true;
            setter.begin_set_parameter(&params.hand_z);
        }
        let z = params.hand_z.unmodulated_plain_value() + scroll * DEPTH_PER_SCROLL;
        setter.set_parameter(&params.hand_z, z);
    } else if state.scrolling {
        state.scrolling = false;
        setter.end_set_parameter(&params.hand_z);
    }

    draw(&painter, &view, s);
}

fn tint(material: f32) -> [f32; 3] {
    let t = ((material - 0.25) / 0.6).clamp(0.0, 1.0);
    [0, 1, 2].map(|i| POD[i] + (BRASS[i] - POD[i]) * t)
}

fn rgb(c: [f32; 3], shade: f32) -> Color32 {
    let [r, g, b] = c.map(|v| (v * shade).clamp(0.0, 255.0) as u8);
    Color32::from_rgb(r, g, b)
}

fn draw(painter: &egui::Painter, view: &View, s: &Snapshot) {
    let knot = view.project(s.hand[0], s.hand[1], s.hand[2]);
    let rope = Stroke::new(3.2_f32, JUTE);
    painter.line_segment([Pos2::new(knot.x, view.rect.top()), knot], rope);
    painter.add(egui::Shape::ellipse_filled(knot, Vec2::new(7.0, 9.0), JUTE));

    let pods = &s.pods[..s.count];
    let mut order: [usize; pod_rattle_engine::MAX_PODS] = std::array::from_fn(|i| i);
    let order = &mut order[..s.count];
    order.sort_by(|a, b| pods[*b].z.total_cmp(&pods[*a].z));

    let string = Stroke::new(1.3_f32, JUTE.gamma_multiply(0.85));
    for &i in order.iter() {
        let pod = pods[i];
        painter.line_segment(
            [
                view.project(pod.knot_x, s.hand[1], pod.knot_z),
                view.project(pod.x, pod.y, pod.z),
            ],
            string,
        );
    }
    let base = tint(s.material);
    for &i in order.iter() {
        let pod = pods[i];
        let center = view.project(pod.x, pod.y, pod.z);
        let radius = pod.radius * view.scale * (1.0 - pod.z * 1.2);
        let shade = (1.0 - pod.z * 6.0).clamp(0.55, 1.15);
        painter.circle_filled(center, radius, rgb(base, shade));
        painter.circle_filled(
            center + Vec2::new(-radius * 0.3, -radius * 0.35),
            radius * 0.45,
            rgb(base, shade * 1.25).gamma_multiply(0.6),
        );
        painter.add(egui::Shape::ellipse_filled(
            center,
            Vec2::new(radius * 0.86, radius * 0.28),
            rgb(base, shade * 0.45),
        ));
        if pod.flash > 0.12 {
            painter.circle_stroke(
                center,
                radius + 1.5 + pod.flash * 3.0,
                Stroke::new(2.0_f32, FLASH.gamma_multiply(pod.flash.min(1.0))),
            );
        }
    }
}
