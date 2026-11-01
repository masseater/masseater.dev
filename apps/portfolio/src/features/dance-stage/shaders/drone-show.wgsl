// dispatch: 60
const COLUMNS = 64.0;
const ROWS = 60.0;
const DRONES = 3840.0;
const RADIUS = 6;

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) id: vec3<u32>) {
  let fi = f32(id.x);
  let g = vec2<f32>(fi % COLUMNS, floor(fi / COLUMNS)) / vec2<f32>(COLUMNS - 1.0, ROWS - 1.0);
  let home = mix(vec2<f32>(0.3, 0.05), vec2<f32>(0.85, 0.95), g);
  let on = step(0.5, matte(home));
  let phase = fract(block.time / 6.0);
  let k = smoothstep(0.35, 0.55, phase) * (1.0 - smoothstep(0.8, 1.0, phase));
  let a = fract(fi * 0.6180339) * 2.0 * PI;
  let fill = 0.35 + 0.65 * sqrt(hash(vec2<f32>(fi, 7.0)));
  var heart = vec2<f32>(16.0 * sin(a) * sin(a) * sin(a), -(13.0 * cos(a) - 5.0 * cos(2.0 * a) - 2.0 * cos(3.0 * a) - cos(4.0 * a))) * 0.018 * fill;
  heart = heart * vec2<f32>(1.0 / aspect(), 1.0) + vec2<f32>(0.5, 0.45);
  let pos = mix(home, heart, k);
  let vis = mix(on, 1.0, k);
  if (vis < 0.01) {
    return;
  }
  let hue = fract(g.y * 3.0 + g.x * 0.5 + block.time * 0.05);
  for (var dy = -RADIUS; dy <= RADIUS; dy++) {
    for (var dx = -RADIUS; dx <= RADIUS; dx++) {
      let o = vec2<f32>(f32(dx), f32(dy));
      deposit(pos + o / vec2<f32>(DENSITY), exp(-dot(o, o) / 6.0) * vis, hue);
    }
  }
}
