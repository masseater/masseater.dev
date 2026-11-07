use criterion::{BenchmarkId, Criterion, Throughput, criterion_group, criterion_main};
use pod_rattle_engine::{AutoShake, Engine, Material, Params};
use std::hint::black_box;

const SAMPLE_RATE: f64 = 48_000.0;
const BLOCK: usize = 512;

fn render(c: &mut Criterion) {
    let mut group = c.benchmark_group("render 1 s at 48 kHz");
    group.throughput(Throughput::Elements(SAMPLE_RATE as u64));
    let shake = AutoShake {
        on: true,
        rate: 7.0,
        amp: 1.0,
    };
    for material in Material::ALL {
        for count in [28, 48] {
            let params = Params {
                count,
                ..material.params()
            };
            group.bench_with_input(
                BenchmarkId::new(format!("{material:?}"), count),
                &params,
                |b, params| {
                    let mut engine = Engine::new(SAMPLE_RATE, *params, shake);
                    let mut left = [0.0; BLOCK];
                    let mut right = [0.0; BLOCK];
                    b.iter(|| {
                        for _ in 0..(SAMPLE_RATE as usize / BLOCK) {
                            engine.render(&mut left, &mut right);
                        }
                        black_box(left[0])
                    });
                },
            );
        }
    }
    group.finish();
}

criterion_group!(benches, render);
criterion_main!(benches);
