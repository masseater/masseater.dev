use pod_rattle_engine::{AutoShake, Engine, Material, Params};

#[test]
#[cfg_attr(
    debug_assertions,
    ignore = "timing is only meaningful in release builds"
)]
fn worst_case_runs_four_times_faster_than_real_time() {
    let sample_rate = 96_000.0;
    let mut engine = Engine::new(
        sample_rate,
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
    let blocks = (sample_rate as usize * 2) / left.len();
    let started = std::time::Instant::now();
    for _ in 0..blocks {
        engine.render(&mut left, &mut right);
    }
    let factor = 2.0 / started.elapsed().as_secs_f64();
    println!("48 pods at 96 kHz: {factor:.1}x real time");
    assert!(factor > 4.0, "only {factor:.1}x real time");
}
