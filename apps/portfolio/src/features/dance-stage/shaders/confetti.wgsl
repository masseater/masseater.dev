// dispatch: 24
const HALF_LENGTH = 12.0;
const HALF_WIDTH = 7.0;

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) id: vec3<u32>) {
  let fi = f32(id.x);
  let burst = floor(block.beatCount / 8.0);
  let t = ((block.beatCount % 8.0) + block.beat) * 0.5;
  let seed = vec2<f32>(fi, burst);
  let x = hash(seed) + sin(t * 2.0 + fi) * 0.03;
  let y = -0.1 + t * (0.25 + 0.2 * hash(seed + 1.0)) - hash(seed + 2.0) * 0.6;
  let center = vec2<f32>(x, y);
  if (center.y < -0.05 || center.y > 1.05) {
    return;
  }
  let flip = abs(sin(t * 6.0 + fi));
  let angle = fi + t * 3.0;
  let along = vec2<f32>(cos(angle), sin(angle));
  let across = vec2<f32>(-along.y, along.x);
  let hue = hash(seed + 3.0);
  let shade = 0.6 + 0.4 * flip;
  let reach = HALF_LENGTH * (flip + 0.15);
  let pixel = center * vec2<f32>(DENSITY);
  let box = i32(ceil(max(reach, HALF_WIDTH)));
  for (var dy = -box; dy <= box; dy++) {
    for (var dx = -box; dx <= box; dx++) {
      let o = vec2<f32>(f32(dx), f32(dy));
      if (abs(dot(o, along)) <= reach && abs(dot(o, across)) <= HALF_WIDTH) {
        deposit((floor(pixel) + o + 0.5) / vec2<f32>(DENSITY), shade, hue);
      }
    }
  }
}
