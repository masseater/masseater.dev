use pod_rattle_engine::{AutoShake, Engine, Params};
use serde::Deserialize;
use std::path::PathBuf;

const BLOCK: usize = 128;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct Scenario {
    name: String,
    sample_rate: f64,
    seconds: f64,
    params: JsParams,
    auto: AutoShakeJs,
    events: Vec<Event>,
}

#[derive(Deserialize, Default, Clone, Copy)]
#[serde(rename_all = "camelCase")]
struct JsParams {
    count: Option<usize>,
    material: Option<f64>,
    decay: Option<f64>,
    pitch: Option<f64>,
    rest: Option<f64>,
    bright: Option<f64>,
    spread: Option<f64>,
    hi_decay: Option<f64>,
    hard: Option<f64>,
    len: Option<f64>,
    gain: Option<f64>,
}

impl JsParams {
    fn apply(self, p: &mut Params) {
        let set = |dst: &mut f64, v: Option<f64>| {
            if let Some(v) = v {
                *dst = v;
            }
        };
        if let Some(c) = self.count {
            p.count = c;
        }
        set(&mut p.material, self.material);
        set(&mut p.decay, self.decay);
        set(&mut p.pitch, self.pitch);
        set(&mut p.rest, self.rest);
        set(&mut p.bright, self.bright);
        set(&mut p.spread, self.spread);
        set(&mut p.hi_decay, self.hi_decay);
        set(&mut p.hard, self.hard);
        set(&mut p.len, self.len);
        set(&mut p.gain, self.gain);
    }
}

#[derive(Deserialize)]
struct AutoShakeJs {
    on: bool,
    rate: f64,
    amp: f64,
}

#[derive(Deserialize)]
#[serde(tag = "type")]
enum Event {
    #[serde(rename = "target")]
    Target { at: f64, x: f64, y: f64 },
    #[serde(rename = "p")]
    Params { at: f64, p: JsParams },
}

fn parity_dir() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../tools/pod-rattle-parity")
}

fn render(s: &Scenario) -> Vec<f64> {
    let mut params = Params::default();
    s.params.apply(&mut params);
    let mut engine = Engine::new(
        s.sample_rate,
        params,
        AutoShake {
            on: s.auto.on,
            rate: s.auto.rate,
            amp: s.auto.amp,
        },
    );
    let total = (s.sample_rate * s.seconds).round() as usize;
    let mut out = Vec::with_capacity(total * 2);
    let mut pos = 0;
    while pos < total {
        for e in &s.events {
            let at = match e {
                Event::Target { at, .. } | Event::Params { at, .. } => *at,
            };
            let sample = (at * s.sample_rate).round() as usize;
            if sample < pos || sample >= pos + BLOCK {
                continue;
            }
            match e {
                Event::Target { x, y, .. } => engine.set_target(*x, *y),
                Event::Params { p, .. } => {
                    let mut next = *engine.params();
                    p.apply(&mut next);
                    engine.set_params(next);
                }
            }
        }
        for _ in pos..(pos + BLOCK).min(total) {
            let (l, r) = engine.tick();
            out.push(l);
            out.push(r);
        }
        pos += BLOCK;
    }
    out
}

fn reference(name: &str) -> Vec<f64> {
    let dir = std::env::var("POD_RATTLE_REFERENCE")
        .map_or_else(|_| parity_dir().join("reference"), PathBuf::from);
    let bytes = std::fs::read(dir.join(format!("{name}.f64"))).unwrap_or_else(|e| {
        panic!("{name}: {e}. Run `node tools/pod-rattle-parity/render.mjs tools/pod-rattle-parity/reference`")
    });
    bytes
        .as_chunks::<8>()
        .0
        .iter()
        .map(|c| f64::from_le_bytes(*c))
        .collect()
}

fn rms(x: &[f64]) -> f64 {
    (x.iter().map(|v| v * v).sum::<f64>() / x.len() as f64).sqrt()
}

const EXACT_SECONDS: f64 = 0.25;
const EXACT_TOLERANCE: f64 = 1e-9;
const RMS_WINDOW_SECONDS: f64 = 0.1;
const RMS_RATIO: (f64, f64) = (0.8, 1.25);

#[test]
fn matches_web_engine() {
    let scenarios: Vec<Scenario> = serde_json::from_str(
        &std::fs::read_to_string(parity_dir().join("scenarios.json")).unwrap(),
    )
    .unwrap();
    for s in &scenarios {
        let ours = render(s);
        let theirs = reference(&s.name);
        assert_eq!(ours.len(), theirs.len(), "{}", s.name);
        let exact = (s.sample_rate * EXACT_SECONDS) as usize * 2;
        let first_diff = ours
            .iter()
            .zip(&theirs)
            .position(|(a, b)| (a - b).abs() > EXACT_TOLERANCE);
        let window = (s.sample_rate * RMS_WINDOW_SECONDS) as usize * 2;
        let ratios: Vec<f64> = ours
            .chunks(window)
            .zip(theirs.chunks(window))
            .map(|(a, b)| rms(a) / rms(b).max(1e-12))
            .collect();
        println!(
            "{}: identical for {:.3} s, RMS ratio per {RMS_WINDOW_SECONDS} s {ratios:.2?}",
            s.name,
            first_diff.map_or(s.seconds, |i| i as f64 / 2.0 / s.sample_rate),
        );
        assert!(
            first_diff.is_none_or(|i| i >= exact),
            "{}: diverged from the web engine at sample {:?}",
            s.name,
            first_diff.map(|i| i / 2)
        );
        assert!(
            ratios
                .iter()
                .all(|r| (RMS_RATIO.0..=RMS_RATIO.1).contains(r)),
            "{}: loudness drifted from the web engine {ratios:.2?}",
            s.name
        );
    }
}
