use pod_rattle_engine::{AutoShake, Engine, Material, Params};

fn render(engine: &mut Engine) -> Vec<f32> {
    let mut left = vec![0.0; 48_000];
    let mut right = vec![0.0; 48_000];
    engine.render(&mut left, &mut right);
    left.extend(right);
    left
}

#[test]
fn reset_sounds_like_a_new_engine() {
    let params = Material::Bamboo.params();
    let auto = AutoShake::default();
    let mut fresh = Engine::new(48_000.0, params, auto);
    let expected = render(&mut fresh);

    let mut used = Engine::new(
        48_000.0,
        Params {
            count: 48,
            ..Material::Steel.params()
        },
        auto,
    );
    used.set_position(0.1, 0.02, -0.05);
    let _ = render(&mut used);
    used.reset(params, auto);
    assert_eq!(render(&mut used), expected);
}
