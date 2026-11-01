// dispatch: 512
@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) id: vec3<u32>) {
  let seed = f32(id.x);
  var p = vec3<f32>(
    hash(vec2<f32>(seed, 1.0)) * 30.0 - 15.0,
    hash(vec2<f32>(seed, 2.0)) * 30.0 - 15.0,
    hash(vec2<f32>(seed, 3.0)) * 40.0 + 5.0,
  );
  let a = block.time * 0.2;
  for (var i = 0u; i < 600u; i++) {
    let v = vec3<f32>(10.0 * (p.y - p.x), p.x * (28.0 - p.z) - p.y, p.x * p.y - 8.0 / 3.0 * p.z);
    p += v * 0.004;
    if (i > 200u) {
      let s = vec2<f32>(p.x * cos(a) + p.y * sin(a), p.z - 25.0) * 0.016;
      plot(vec2<f32>(0.5 + s.x / aspect(), 0.5 - s.y), length(v) * 0.004);
    }
  }
}
