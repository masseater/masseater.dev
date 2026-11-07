use cpu_time::ThreadTime;
use pod_rattle_engine::{AutoShake, Engine, Material, Params};

const SAMPLE_RATE: f64 = 96_000.0;
const SECONDS: f64 = 2.0;
const RUNS: usize = 5;

fn render_seconds() -> f64 {
    let mut engine = Engine::new(
        SAMPLE_RATE,
        Params {
            count: 48,
            ..Material::Seed.params()
        },
        AutoShake {
            on: true,
            rate: 7.0,
            amp: 1.0,
        },
    );
    let mut left = vec![0.0; 256];
    let mut right = vec![0.0; 256];
    let blocks = (SAMPLE_RATE * SECONDS) as usize / left.len();
    let started = ThreadTime::now();
    for _ in 0..blocks {
        engine.render(&mut left, &mut right);
    }
    started.elapsed().as_secs_f64()
}

// verify は他のタスクと並べて動くので、壁時計ではなくこのスレッドの CPU 時間を測り、
// 最も速かった回で判定する。
#[test]
#[cfg_attr(
    debug_assertions,
    ignore = "timing is only meaningful in release builds"
)]
fn worst_case_runs_four_times_faster_than_real_time() {
    let fastest = (0..RUNS)
        .map(|_| render_seconds())
        .fold(f64::INFINITY, f64::min);
    let factor = SECONDS / fastest;
    println!("48 pods at 96 kHz: {factor:.1}x real time (thread CPU time, best of {RUNS})");
    assert!(factor > 4.0, "only {factor:.1}x real time");
}
