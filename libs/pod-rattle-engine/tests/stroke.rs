use pod_rattle_engine::{AutoShake, Engine, Params};

fn energy(engine: &mut Engine, seconds: f64) -> f64 {
    let mut left = vec![0.0; (engine.sample_rate() * seconds) as usize];
    let mut right = left.clone();
    engine.render(&mut left, &mut right);
    left.iter()
        .chain(&right)
        .map(|v| f64::from(*v).powi(2))
        .sum()
}

#[test]
fn rattle_rests_until_struck_and_rings_when_struck() {
    let mut engine = Engine::new(
        48_000.0,
        Params::default(),
        AutoShake {
            on: false,
            ..AutoShake::default()
        },
    );
    energy(&mut engine, 3.0);
    let resting = energy(&mut engine, 0.5);
    assert!(resting < 1e-6, "resting rattle still sounds: {resting}");

    let mut struck = Vec::new();
    for velocity in [1.0, 1.0, 0.3] {
        engine.stroke(velocity);
        struck.push(energy(&mut engine, 0.4));
    }
    assert!(struck[0] > 1.0, "a full stroke is too quiet: {}", struck[0]);
    assert!(
        struck[1] < struck[0],
        "a soft stroke is not softer: {struck:?}"
    );
}
