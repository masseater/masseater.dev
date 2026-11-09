use egui::{Event, Modifiers, PointerButton, Pos2, Vec2};
use egui_kittest::Harness;
use egui_kittest::kittest::Queryable;
use nice_plug::context::PluginApi;
use nice_plug::context::gui::{GuiContext, GuiContextInner};
use nice_plug::params::Param;
use nice_plug::params::internals::ParamPtr;
use nice_plug::plugin::PluginState;
use pod_rattle::RattleParams;
use pod_rattle::Telemetry;
use pod_rattle::editor::{EDITOR_SIZE, EditorView};
use pod_rattle_engine::{Engine, Material};
use std::sync::atomic::Ordering;
use std::sync::{Arc, Mutex};

const SAMPLE_RATE: f64 = 48_000.0;
const SLIDER_OFFSET: f32 = 104.0;
const SLIDER_WIDTH: f32 = 150.0;

#[derive(Default)]
struct Host {
    edits: Mutex<Vec<(String, f32)>>,
}

impl Host {
    fn take(&self) -> Vec<(String, f32)> {
        std::mem::take(&mut self.edits.lock().unwrap())
    }
}

impl GuiContextInner for Host {
    fn plugin_api(&self) -> PluginApi {
        PluginApi::Clap
    }

    unsafe fn raw_begin_set_parameter(&self, _param: ParamPtr) {}

    unsafe fn raw_set_parameter_normalized(&self, param: ParamPtr, normalized: f32) {
        unsafe {
            param._internal_set_normalized_value(normalized);
            let name = param.name().to_owned();
            self.edits.lock().unwrap().push((name, normalized));
        }
    }

    unsafe fn raw_end_set_parameter(&self, _param: ParamPtr) {}

    fn get_state(&self) -> PluginState {
        unreachable!("the editor does not read the plugin state")
    }

    fn set_state(&self, _state: PluginState) {
        unreachable!("the editor does not write the plugin state")
    }

    fn request_restart(&self) {}
}

struct Fixture {
    host: Arc<Host>,
    params: Arc<RattleParams>,
    telemetry: Arc<Telemetry>,
}

fn fixture() -> Fixture {
    let params = Arc::new(RattleParams::default());
    let (telemetry, mut snapshot) = Telemetry::new();
    let mut engine = Engine::new(SAMPLE_RATE, params.engine_params(), params.auto_shake());
    let mut left = vec![0.0; 2_400];
    let mut right = vec![0.0; 2_400];
    engine.stroke(1.0);
    engine.render(&mut left, &mut right);
    engine.snapshot(snapshot.input_buffer_mut());
    snapshot.publish();
    Fixture {
        host: Arc::new(Host::default()),
        params,
        telemetry: Arc::new(telemetry),
    }
}

fn harness(f: &Fixture) -> Harness<'static, EditorView> {
    let gui = GuiContext::new(f.host.clone());
    let mut harness = Harness::builder()
        .with_size(Vec2::new(EDITOR_SIZE.width, EDITOR_SIZE.height))
        .with_context_setup(EditorView::style)
        .build_ui_state(
            move |ui, view: &mut EditorView| view.show(ui, &gui.param_setter()),
            EditorView::new(f.params.clone(), f.telemetry.clone()),
        );
    harness.run();
    harness
}

fn drag(harness: &mut Harness<'_, EditorView>, from: Pos2, to: Pos2) {
    harness.event(Event::PointerMoved(from));
    harness.run();
    harness.event(Event::PointerButton {
        pos: from,
        button: PointerButton::Primary,
        pressed: true,
        modifiers: Modifiers::NONE,
    });
    harness.run();
    for step in 1..=4 {
        harness.event(Event::PointerMoved(
            from + (to - from) * (step as f32 / 4.0),
        ));
        harness.run();
    }
}

fn release(harness: &mut Harness<'_, EditorView>, at: Pos2) {
    harness.event(Event::PointerButton {
        pos: at,
        button: PointerButton::Primary,
        pressed: false,
        modifiers: Modifiers::NONE,
    });
    harness.run();
}

#[test]
fn draws_the_editor() {
    let f = fixture();
    let mut harness = harness(&f);
    harness.snapshot("editor");
}

#[test]
fn material_button_sets_every_material_param() {
    let f = fixture();
    let mut harness = harness(&f);
    harness.get_by_label("Brass").click();
    harness.run();
    harness.remove_cursor();
    harness.run();

    let brass = f.params.material_fields(Material::Brass);
    for (param, value) in brass {
        assert!(
            (param.value() - value).abs() < 1e-3,
            "{} is {} after pressing Brass, want {value}",
            param.name(),
            param.value()
        );
    }
    assert_eq!(f.host.take().len(), brass.len());
    harness.snapshot("editor-brass");
}

#[test]
fn slider_drag_changes_its_param() {
    let f = fixture();
    let mut harness = harness(&f);
    let label = harness.get_by_label("Volume").rect();
    let y = label.center().y;
    let left = label.left() + SLIDER_OFFSET;
    let from = Pos2::new(left + SLIDER_WIDTH * 0.5, y);
    let to = Pos2::new(left + SLIDER_WIDTH * 0.25, y);
    drag(&mut harness, from, to);
    release(&mut harness, to);

    let edits = f.host.take();
    assert!(
        !edits.is_empty() && edits.iter().all(|(name, _)| name == "Volume"),
        "edits: {edits:?}"
    );
    let gain = f.params.gain.value();
    assert!(
        (0.4..0.6).contains(&gain),
        "Volume is {gain}, want about 0.5"
    );
}

#[test]
fn auto_shake_toggle_turns_it_on() {
    let f = fixture();
    let mut harness = harness(&f);
    harness.get_by_label("Off").click();
    harness.run();
    assert!(f.params.auto.value());
    assert_eq!(f.host.take(), vec![("Auto shake".to_owned(), 1.0)]);
}

#[test]
fn dragging_the_stage_moves_the_hand() {
    let f = fixture();
    let mut harness = harness(&f);
    let from = Pos2::new(300.0, 200.0);
    let to = Pos2::new(360.0, 240.0);
    drag(&mut harness, from, to);
    assert!(f.telemetry.grabbing.load(Ordering::Relaxed));
    let x = f.telemetry.target_x.load(Ordering::Relaxed);
    let y = f.telemetry.target_y.load(Ordering::Relaxed);
    release(&mut harness, to);
    assert!(!f.telemetry.grabbing.load(Ordering::Relaxed));
    assert!(x > 0.0, "hand x {x} should move right");
    assert!(y < 0.0, "hand y {y} should move down");
}
