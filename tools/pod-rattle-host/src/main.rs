use nice_plug::prelude::{FloatParam, Param};
use pod_rattle::RattleParams;
use pod_rattle_engine::Engine;
use std::path::{Path, PathBuf};
use std::process::ExitCode;
use vst3_host::midi::{MidiChannel, MidiEvent};

const SAMPLE_RATE: u32 = 48_000;
const BLOCK: usize = 512;
const SAMPLES_PER_TICK: usize = 50;
const TAIL_SECONDS: usize = 2;
const KEY: u8 = 60;
const TOLERANCE: f32 = 1e-6;
const AUDIBLE: f32 = 0.01;

const NOTES: [(u32, u8); 8] = [
    (48, 127),
    (256, 30),
    (300, 100),
    (301, 64),
    (600, 90),
    (1024, 10),
    (1100, 120),
    (1500, 80),
];

const MOVES: [(u32, Axis, f64); 7] = [
    (100, Axis::X, 0.6),
    (400, Axis::Z, 0.4),
    (700, Axis::Y, 0.75),
    (900, Axis::Z, 0.6),
    (1200, Axis::X, 0.5),
    (1300, Axis::Y, 0.625),
    (1400, Axis::Z, 0.5),
];

#[derive(Clone, Copy)]
enum Axis {
    X,
    Y,
    Z,
}

impl Axis {
    const fn name(self) -> &'static str {
        match self {
            Self::X => "Hand X",
            Self::Y => "Hand Y",
            Self::Z => "Hand Z",
        }
    }

    const fn param(self, params: &RattleParams) -> &FloatParam {
        match self {
            Self::X => &params.hand_x,
            Self::Y => &params.hand_y,
            Self::Z => &params.hand_z,
        }
    }
}

#[derive(Clone, Copy)]
enum Event {
    Move(Axis, f64),
    Note(u8),
}

struct Scenario {
    name: &'static str,
    auto_shake: bool,
    moves: &'static [(u32, Axis, f64)],
}

const SCENARIOS: [Scenario; 4] = [
    Scenario {
        name: "notes",
        auto_shake: false,
        moves: &[],
    },
    Scenario {
        name: "auto-shake",
        auto_shake: true,
        moves: &[],
    },
    Scenario {
        name: "hand-automation",
        auto_shake: false,
        moves: &MOVES,
    },
    Scenario {
        name: "auto-shake-automation",
        auto_shake: true,
        moves: &MOVES,
    },
];

fn main() -> ExitCode {
    let mut args = std::env::args_os().skip(1);
    let (Some(plugin), Some(out)) = (args.next(), args.next()) else {
        eprintln!("usage: pod-rattle-host <Pod Rattle.vst3> <output dir>");
        return ExitCode::FAILURE;
    };
    let plugin = PathBuf::from(plugin);
    let out = PathBuf::from(out);
    std::fs::create_dir_all(&out).expect("create output dir");

    let mut failed = false;
    for scenario in &SCENARIOS {
        match run(scenario, &plugin, &out) {
            Ok(report) => println!("{}: {report}", scenario.name),
            Err(error) => {
                eprintln!("{}: {error}", scenario.name);
                failed = true;
            }
        }
    }
    if failed {
        ExitCode::FAILURE
    } else {
        ExitCode::SUCCESS
    }
}

fn run(scenario: &Scenario, plugin: &Path, out: &Path) -> Result<String, String> {
    let (left, right) = render_in_host(scenario, plugin)?;
    write_wav(&out.join(format!("{}.wav", scenario.name)), &left, &right)?;
    let (expected_left, expected_right) = render_reference(scenario, left.len());

    let mut peak = 0.0_f32;
    let mut diff = 0.0_f32;
    let mut first_mismatch = None;
    for i in 0..left.len() {
        for (got, want) in [(left[i], expected_left[i]), (right[i], expected_right[i])] {
            if !got.is_finite() {
                return Err(format!("non-finite sample at {i}"));
            }
            peak = peak.max(got.abs());
            let d = (got - want).abs();
            if d > TOLERANCE && first_mismatch.is_none() {
                first_mismatch = Some(i);
            }
            diff = diff.max(d);
        }
    }
    if let Some(at) = first_mismatch {
        return Err(format!(
            "host output differs from the engine from sample {at} (max diff {diff:e})"
        ));
    }
    if peak < AUDIBLE {
        return Err(format!("host output is silent (peak {peak})"));
    }
    if peak > 1.0 {
        return Err(format!("host output clips (peak {peak})"));
    }
    Ok(format!(
        "{} samples, peak {peak:.3}, max diff {diff:e}",
        left.len()
    ))
}

fn render_in_host(scenario: &Scenario, plugin: &Path) -> Result<(Vec<f32>, Vec<f32>), String> {
    let mut host =
        vst3_host::simple::load_plugin_with_settings(plugin, f64::from(SAMPLE_RATE), BLOCK)
            .map_err(|e| format!("load the plugin: {e}"))?;
    if scenario.auto_shake {
        host.set_parameter_by_name("Auto shake", 1.0)
            .map_err(|e| format!("set Auto shake: {e}"))?;
    }
    let mut moves = Vec::with_capacity(scenario.moves.len());
    for &(tick, axis, normalized) in scenario.moves {
        let id = host
            .find_parameter(axis.name())
            .map_err(|e| format!("find {}: {e}", axis.name()))?
            .id;
        moves.push((tick as usize * SAMPLES_PER_TICK, id, normalized));
    }
    host.start_processing()
        .map_err(|e| format!("start processing: {e}"))?;

    let last = NOTES
        .iter()
        .map(|&(tick, _)| tick)
        .chain(scenario.moves.iter().map(|&(tick, ..)| tick))
        .max()
        .unwrap_or(0) as usize;
    let total = last * SAMPLES_PER_TICK + TAIL_SECONDS * SAMPLE_RATE as usize;
    let mut left = Vec::with_capacity(total);
    let mut right = Vec::with_capacity(total);
    while left.len() < total {
        let start = left.len();
        let frames = BLOCK.min(total - start);
        for (tick, velocity) in NOTES {
            let at = tick as usize * SAMPLES_PER_TICK;
            if (start..start + frames).contains(&at) {
                let offset = (at - start) as i32;
                for event in [
                    MidiEvent::NoteOn {
                        channel: MidiChannel::Ch1,
                        note: KEY,
                        velocity,
                    },
                    MidiEvent::NoteOff {
                        channel: MidiChannel::Ch1,
                        note: KEY,
                        velocity: 0,
                    },
                ] {
                    host.send_midi_event_at(event, offset)
                        .map_err(|e| format!("send a note: {e}"))?;
                }
            }
        }
        for &(at, id, normalized) in &moves {
            if (start..start + frames).contains(&at) {
                host.set_parameter_at(id, normalized, (at - start) as i32)
                    .map_err(|e| format!("automate a parameter: {e}"))?;
            }
        }
        let mut buffers = vst3_host::audio::AudioBuffers::new(0, 2, frames, f64::from(SAMPLE_RATE));
        host.process_audio(&mut buffers)
            .map_err(|e| format!("process a block: {e}"))?;
        left.extend_from_slice(&buffers.outputs[0][..frames]);
        right.extend_from_slice(&buffers.outputs[1][..frames]);
    }
    host.stop_processing()
        .map_err(|e| format!("stop processing: {e}"))?;
    Ok((left, right))
}

fn write_wav(path: &Path, left: &[f32], right: &[f32]) -> Result<(), String> {
    let spec = hound::WavSpec {
        channels: 2,
        sample_rate: SAMPLE_RATE,
        bits_per_sample: 32,
        sample_format: hound::SampleFormat::Float,
    };
    let mut writer = hound::WavWriter::create(path, spec).map_err(|e| e.to_string())?;
    for (l, r) in left.iter().zip(right) {
        writer.write_sample(*l).map_err(|e| e.to_string())?;
        writer.write_sample(*r).map_err(|e| e.to_string())?;
    }
    writer.finalize().map_err(|e| e.to_string())
}

fn render_reference(scenario: &Scenario, len: usize) -> (Vec<f32>, Vec<f32>) {
    let params = RattleParams::default();
    let mut auto = params.auto_shake();
    auto.on = scenario.auto_shake;
    let mut engine = Engine::new(f64::from(SAMPLE_RATE), params.engine_params(), auto);
    let mut events: Vec<(usize, Event)> = scenario
        .moves
        .iter()
        .map(|&(tick, axis, normalized)| (tick, Event::Move(axis, normalized)))
        .chain(
            NOTES
                .iter()
                .map(|&(tick, velocity)| (tick, Event::Note(velocity))),
        )
        .map(|(tick, event)| (tick as usize * SAMPLES_PER_TICK, event))
        .collect();
    events.sort_by_key(|&(at, _)| at);
    let mut position = params.position();
    let mut left = vec![0.0; len];
    let mut right = vec![0.0; len];
    let mut pos = 0;
    for (at, event) in events {
        let at = at.min(len);
        engine.render(&mut left[pos..at], &mut right[pos..at]);
        pos = at;
        match event {
            Event::Move(axis, normalized) => {
                position[axis as usize] =
                    f64::from(axis.param(&params).preview_plain(normalized as f32));
                engine.set_position(position[0], position[1], position[2]);
            }
            Event::Note(velocity) if !scenario.auto_shake => {
                engine.stroke(f64::from(f32::from(velocity) / 127.0));
            }
            Event::Note(_) => {}
        }
    }
    engine.render(&mut left[pos..], &mut right[pos..]);
    (left, right)
}
