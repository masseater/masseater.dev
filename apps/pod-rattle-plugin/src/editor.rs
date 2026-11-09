use crate::Telemetry;
use crate::params::RattleParams;
use egui::{Align2, Color32, FontId, Pos2, Rect, Sense, Stroke, Vec2};
use nice_plug::context::gui::GuiContext;
use nice_plug::editor::dpi::LogicalSize;
use nice_plug::prelude::*;
use nice_plug_egui::{
    EguiEditor, EguiEditorState, EguiNiceSettings, Frame, NiceEguiApp, RepaintNotifier,
    create_egui_editor, widgets::ParamSlider,
};
use pod_rattle_engine::{HAND_X, HAND_Y, Material, Snapshot};
use std::sync::Arc;
use std::sync::atomic::Ordering;

const BG: Color32 = Color32::from_rgb(0x17, 0x12, 0x0f);
const STAGE: Color32 = Color32::from_rgb(0x1f, 0x19, 0x15);
const FG: Color32 = Color32::from_rgb(0xef, 0xe6, 0xdc);
const MUTED: Color32 = Color32::from_rgb(0xa5, 0x95, 0x85);
const LINE: Color32 = Color32::from_rgb(0x3a, 0x2f, 0x28);
const POD: [f32; 3] = [142.0, 60.0, 42.0];
const BRASS: [f32; 3] = [201.0, 151.0, 58.0];
const JUTE: Color32 = Color32::from_rgb(0x8f, 0x7b, 0x58);
const ACCENT: Color32 = Color32::from_rgb(0xe0, 0x8a, 0x5a);
const FLASH: Color32 = Color32::from_rgb(0xf2, 0xc4, 0x6b);
const RAIL_WIDTH: f32 = 340.0;
const SLIDER_WIDTH: f32 = 150.0;
pub const EDITOR_SIZE: LogicalSize<f32> = LogicalSize::new(960.0, 600.0);

#[derive(Default)]
struct EditorState {
    snapshot: Snapshot,
    grab: Option<Grab>,
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
        let origin = Pos2::new(rect.center().x, rect.top() + rect.height() * 0.22);
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
            style.visuals.widgets.inactive.bg_fill = LINE;
        });
    }

    pub fn show(&mut self, ui: &mut egui::Ui, setter: &ParamSetter) {
        let (params, telemetry, state) = (&self.params, &self.telemetry, &mut self.state);
        if let Ok(mut output) = telemetry.snapshot.lock() {
            state.snapshot = *output.read();
        }
        egui::Panel::right("rail")
            .exact_size(RAIL_WIDTH)
            .resizable(false)
            .show(ui, |ui| rail(ui, params, setter, telemetry));
        egui::CentralPanel::default()
            .frame(egui::Frame::new().fill(STAGE))
            .show(ui, |ui| stage(ui, params, setter, telemetry, state));
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

fn heading(ui: &mut egui::Ui, text: &str) {
    ui.add_space(6.0);
    ui.label(egui::RichText::new(text).size(11.0).color(MUTED).strong());
}

fn slider(ui: &mut egui::Ui, param: &impl Param, setter: &ParamSetter) {
    ui.label(egui::RichText::new(param.name()).color(FG));
    ui.add(ParamSlider::for_param(param, setter).with_width(SLIDER_WIDTH));
    ui.end_row();
}

fn group(ui: &mut egui::Ui, title: &str, rows: impl FnOnce(&mut egui::Ui)) {
    if title.is_empty() {
        ui.add_space(4.0);
    } else {
        heading(ui, title);
    }
    egui::Grid::new(("group", title))
        .num_columns(2)
        .min_col_width(96.0)
        .spacing(Vec2::new(8.0, 6.0))
        .show(ui, rows);
}

fn rail(ui: &mut egui::Ui, params: &RattleParams, setter: &ParamSetter, telemetry: &Telemetry) {
    heading(ui, "MATERIAL");
    ui.horizontal(|ui| {
        for material in Material::ALL {
            let fields = params.material_fields(material);
            let selected = fields
                .iter()
                .all(|(param, value)| (param.value() - value).abs() < 1e-3);
            let button = egui::Button::new(format!("{material:?}"))
                .selected(selected)
                .min_size(Vec2::new((RAIL_WIDTH - 44.0) / 4.0, 24.0));
            if ui.add(button).clicked() {
                for (param, value) in fields {
                    setter.begin_set_parameter(param);
                    setter.set_parameter(param, value);
                    setter.end_set_parameter(param);
                }
            }
        }
    });
    group(ui, "", |ui| {
        slider(ui, &params.material, setter);
        slider(ui, &params.decay, setter);
        slider(ui, &params.pitch, setter);
        slider(ui, &params.rest, setter);
    });
    group(ui, "OVERTONES", |ui| {
        slider(ui, &params.bright, setter);
        slider(ui, &params.spread, setter);
        slider(ui, &params.hi_decay, setter);
        slider(ui, &params.hard, setter);
    });
    group(ui, "SHAPE", |ui| {
        slider(ui, &params.count, setter);
        slider(ui, &params.len, setter);
    });
    group(ui, "SHAKE", |ui| {
        ui.label(egui::RichText::new(params.auto.name()).color(FG));
        let mut auto = params.auto.value();
        let label = if auto { "On" } else { "Off" };
        if ui.toggle_value(&mut auto, label).changed() {
            setter.begin_set_parameter(&params.auto);
            setter.set_parameter(&params.auto, auto);
            setter.end_set_parameter(&params.auto);
        }
        ui.end_row();
        slider(ui, &params.rate, setter);
        slider(ui, &params.amp, setter);
    });
    group(ui, "OUTPUT", |ui| {
        slider(ui, &params.gain, setter);
    });
    ui.add_space(8.0);
    ui.label(
        egui::RichText::new(format!(
            "DSP {:.1} %",
            telemetry.dsp_load.load(Ordering::Relaxed) * 100.0
        ))
        .font(FontId::monospace(11.0))
        .color(MUTED),
    );
}

fn stage(
    ui: &mut egui::Ui,
    params: &RattleParams,
    setter: &ParamSetter,
    telemetry: &Telemetry,
    state: &mut EditorState,
) {
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
        }
    }
    if let (Some(grab), Some(p)) = (&state.grab, response.interact_pointer_pos()) {
        let target = grab.hand + view.world(p) - grab.pointer;
        telemetry.target_x.store(
            target.x.clamp(HAND_X.0 as f32, HAND_X.1 as f32),
            Ordering::Relaxed,
        );
        telemetry.target_y.store(
            target.y.clamp(HAND_Y.0 as f32, HAND_Y.1 as f32),
            Ordering::Relaxed,
        );
        telemetry.grabbing.store(true, Ordering::Relaxed);
    }
    if response.drag_stopped() {
        state.grab = None;
        telemetry.grabbing.store(false, Ordering::Relaxed);
    }

    draw(&painter, &view, s);
    painter.text(
        view.rect.left_top() + Vec2::new(16.0, 14.0),
        Align2::LEFT_TOP,
        "Pod Rattle",
        FontId::proportional(22.0),
        FG,
    );
    painter.text(
        view.rect.right_bottom() - Vec2::new(16.0, 12.0),
        Align2::RIGHT_BOTTOM,
        format!("{:.0} hits/s", s.hit_rate),
        FontId::monospace(11.0),
        MUTED,
    );
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
