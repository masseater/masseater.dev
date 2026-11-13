use pod_rattle_engine::{AutoShake, Engine, Params, Snapshot};

const STILL: AutoShake = AutoShake {
    on: false,
    rate: 2.6,
    amp: 0.5,
};

fn energy(engine: &mut Engine, seconds: f64) -> f64 {
    let mut left = vec![0.0; (engine.sample_rate() * seconds) as usize];
    let mut right = left.clone();
    engine.render(&mut left, &mut right);
    left.iter()
        .chain(&right)
        .map(|v| f64::from(*v).powi(2))
        .sum()
}

fn hand(engine: &mut Engine) -> [f32; 3] {
    let mut snapshot = Box::new(Snapshot::default());
    engine.snapshot(&mut snapshot);
    snapshot.hand
}

fn resting() -> Engine {
    let mut engine = Engine::new(48_000.0, Params::default(), STILL);
    energy(&mut engine, 3.0);
    engine
}

#[test]
fn moving_the_hand_along_each_axis_rattles_the_pods() {
    for (axis, to) in [[0.15, 0.0, 0.0], [0.0, 0.1, 0.0], [0.0, 0.0, 0.15]]
        .into_iter()
        .enumerate()
    {
        let mut engine = resting();
        engine.set_position(to[0], to[1], to[2]);
        let moved = energy(&mut engine, 0.5);
        assert!(moved > 1.0, "moving along axis {axis} is silent: {moved}");
        energy(&mut engine, 2.0);
        let at = hand(&mut engine);
        for a in 0..3 {
            assert!(
                (f64::from(at[a]) - to[a]).abs() < 1e-3,
                "the hand stopped at {at:?}, want {to:?}"
            );
        }
    }
}

#[test]
fn placing_the_hand_moves_it_without_a_sound() {
    let mut origin = Engine::new(48_000.0, Params::default(), STILL);
    let still = energy(&mut origin, 0.5);
    let mut placed = Engine::new(48_000.0, Params::default(), STILL);
    placed.place(0.2, -0.1, -0.2);
    assert_eq!(hand(&mut placed), [0.2, -0.1, -0.2]);
    let after = energy(&mut placed, 0.5);
    assert!(
        after < still * 1.1,
        "placing the hand rattles the pods: {after}, staying still makes {still}"
    );
    assert_eq!(hand(&mut placed), [0.2, -0.1, -0.2]);
}

#[test]
fn auto_shake_swings_around_the_position() {
    let mut engine = Engine::new(48_000.0, Params::default(), AutoShake::default());
    engine.place(0.0, 0.0, 0.2);
    let mut sum = [0.0_f64; 3];
    let steps = 600;
    for _ in 0..steps {
        energy(&mut engine, 0.005);
        let at = hand(&mut engine);
        for a in 0..3 {
            sum[a] += f64::from(at[a]);
        }
    }
    let mean = sum.map(|v| v / f64::from(steps));
    assert!(mean[0].abs() < 0.01 && mean[1].abs() < 0.01, "{mean:?}");
    assert!((mean[2] - 0.2).abs() < 1e-3, "{mean:?}");
}
