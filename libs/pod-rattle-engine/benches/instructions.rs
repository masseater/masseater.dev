use gungraun::prelude::*;
use gungraun::{Callgrind, EventKind};
use pod_rattle_engine::{AutoShake, Engine, Material, Params};
use std::hint::black_box;

const SAMPLE_RATE: f64 = 96_000.0;
const BLOCK: usize = 256;
const INSTRUCTION_BUDGET: u64 = 2_000_000_000;

fn worst_case() -> Engine {
    Engine::new(
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
    )
}

#[library_benchmark]
#[bench::one_second_48_pods_96k(setup = worst_case)]
fn render_one_second(mut engine: Engine) {
    let mut left = [0.0; BLOCK];
    let mut right = [0.0; BLOCK];
    for _ in 0..(SAMPLE_RATE as usize / BLOCK) {
        engine.render(&mut left, &mut right);
    }
    black_box((left, right));
}

library_benchmark_group!(
    name = render,
    config = LibraryBenchmarkConfig::default()
        .tool(Callgrind::default().hard_limits([(EventKind::Ir, INSTRUCTION_BUDGET)])),
    benchmarks = [render_one_second]
);

main!(library_benchmark_groups = render);
