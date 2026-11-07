#![cfg(debug_assertions)]

use assert_no_alloc::{AllocDisabler, assert_no_alloc};
use pod_rattle_engine::{AutoShake, Engine, Material, Params, Snapshot};

#[global_allocator]
static ALLOCATOR: AllocDisabler = AllocDisabler;

#[test]
fn render_never_allocates() {
    let mut engine = Engine::new(48_000.0, Params::default(), AutoShake::default());
    let mut left = vec![0.0; 512];
    let mut right = vec![0.0; 512];
    let mut snapshot = Box::new(Snapshot::default());
    assert_no_alloc(|| {
        for block in 0..400 {
            if block == 100 {
                engine.set_params(Params {
                    count: 48,
                    ..Material::Steel.params()
                });
            }
            if block == 200 {
                engine.set_target(0.1, 0.02);
            }
            engine.render(&mut left, &mut right);
            engine.snapshot(&mut snapshot);
        }
    });
    assert!(left.iter().any(|v| *v != 0.0));
}
