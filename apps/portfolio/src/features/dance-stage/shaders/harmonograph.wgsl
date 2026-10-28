// dispatch: 2048
const POINTS = 131072.0;

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) id: vec3<u32>) {
  let seed = floor(block.time / 6.0);
  let f1 = 2.0 + floor(hash(vec2<f32>(seed, 1.0)) * 3.0) + 0.01;
  let f2 = 3.0 + floor(hash(vec2<f32>(seed, 2.0)) * 2.0);
  let t = f32(id.x) / POINTS * 30.0;
  if (t > fract(block.time / 6.0) * 30.0) {
    return;
  }
  let decay = exp(-t * 0.04);
  let p = vec2<f32>(sin(t * f1 + 0.5) + sin(t * f2), sin(t * f2 * 1.01) + sin(t * f1 + 1.3)) * 0.2 * decay;
  plot(vec2<f32>(0.5 + p.x / aspect(), 0.5 + p.y), 0.0);
}
