use midly::num::{u4, u7, u15, u24, u28};
use midly::{Format, Header, MetaMessage, MidiMessage, Smf, Timing, TrackEvent, TrackEventKind};
use pod_rattle::RattleParams;
use pod_rattle_engine::Engine;
use std::path::{Path, PathBuf};
use std::process::{Command, ExitCode};

const SAMPLE_RATE: u32 = 48_000;
const BLOCK: usize = 512;
const PPQ: u16 = 480;
const MICROS_PER_BEAT: u32 = 500_000;
const SAMPLES_PER_TICK: usize = 50;
const TAIL_SECONDS: &str = "2";
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

struct Scenario {
    name: &'static str,
    auto_shake: bool,
}

const SCENARIOS: [Scenario; 2] = [
    Scenario {
        name: "notes",
        auto_shake: false,
    },
    Scenario {
        name: "auto-shake",
        auto_shake: true,
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
    let midi = out.join(format!("{}.mid", scenario.name));
    let wav = out.join(format!("{}.wav", scenario.name));
    write_midi(&midi);
    render_in_host(scenario, plugin, &midi, &wav)?;
    let (left, right) = read_wav(&wav)?;
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

fn write_midi(path: &Path) {
    let mut track = vec![TrackEvent {
        delta: u28::new(0),
        kind: TrackEventKind::Meta(MetaMessage::Tempo(u24::new(MICROS_PER_BEAT))),
    }];
    let mut last = 0;
    for (tick, velocity) in NOTES {
        track.push(note(
            tick - last,
            MidiMessage::NoteOn {
                key: u7::new(60),
                vel: u7::new(velocity),
            },
        ));
        track.push(note(
            0,
            MidiMessage::NoteOff {
                key: u7::new(60),
                vel: u7::new(0),
            },
        ));
        last = tick;
    }
    track.push(TrackEvent {
        delta: u28::new(0),
        kind: TrackEventKind::Meta(MetaMessage::EndOfTrack),
    });
    let smf = Smf {
        header: Header::new(Format::SingleTrack, Timing::Metrical(u15::new(PPQ))),
        tracks: vec![track],
    };
    smf.save(path).expect("write midi");
}

fn note(delta: u32, message: MidiMessage) -> TrackEvent<'static> {
    TrackEvent {
        delta: u28::new(delta),
        kind: TrackEventKind::Midi {
            channel: u4::new(0),
            message,
        },
    }
}

fn render_in_host(
    scenario: &Scenario,
    plugin: &Path,
    midi: &Path,
    wav: &Path,
) -> Result<(), String> {
    let project = Path::new(env!("CARGO_MANIFEST_DIR"));
    let mut command = Command::new("uv");
    command
        .args(["run", "--quiet", "--project"])
        .arg(project)
        .args(["minihost", "process"])
        .arg(plugin)
        .args(["-r", &SAMPLE_RATE.to_string(), "-b", &BLOCK.to_string()])
        .arg("-m")
        .arg(midi)
        .arg("-o")
        .arg(wav)
        .args([
            "-t",
            TAIL_SECONDS,
            "--bit-depth",
            "32",
            "--no-resample",
            "-y",
        ]);
    if scenario.auto_shake {
        command.args(["--param", "Auto shake:1"]);
    }
    let status = command.status().map_err(|e| format!("run minihost: {e}"))?;
    if status.success() {
        Ok(())
    } else {
        Err(format!("minihost exited with {status}"))
    }
}

fn read_wav(path: &Path) -> Result<(Vec<f32>, Vec<f32>), String> {
    let mut reader = hound::WavReader::open(path).map_err(|e| e.to_string())?;
    let spec = reader.spec();
    if spec.channels != 2 || spec.sample_rate != SAMPLE_RATE {
        return Err(format!("unexpected wav format {spec:?}"));
    }
    let samples: Vec<f32> = reader
        .samples::<f32>()
        .collect::<Result<_, _>>()
        .map_err(|e| e.to_string())?;
    Ok(samples
        .as_chunks::<2>()
        .0
        .iter()
        .map(|&[l, r]| (l, r))
        .unzip())
}

fn render_reference(scenario: &Scenario, len: usize) -> (Vec<f32>, Vec<f32>) {
    let params = RattleParams::default();
    let mut auto = params.auto_shake();
    auto.on = scenario.auto_shake;
    let mut engine = Engine::new(f64::from(SAMPLE_RATE), params.engine_params(), auto);
    let mut left = vec![0.0; len];
    let mut right = vec![0.0; len];
    let mut pos = 0;
    for (tick, velocity) in NOTES {
        let at = (tick as usize * SAMPLES_PER_TICK).min(len);
        engine.render(&mut left[pos..at], &mut right[pos..at]);
        pos = at;
        if !scenario.auto_shake {
            engine.stroke(f64::from(f32::from(velocity) / 127.0));
        }
    }
    engine.render(&mut left[pos..], &mut right[pos..]);
    (left, right)
}
