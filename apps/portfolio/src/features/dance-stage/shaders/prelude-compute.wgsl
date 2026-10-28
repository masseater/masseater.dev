struct FrameBlock {
  pose: array<vec4<f32>, 33>,
  lastPose: array<vec4<f32>, 33>,
  bands: array<f32, 8>,
  textWidth: array<f32, 8>,
  resolution: vec2<f32>,
  time: f32,
  frame: f32,
  level: f32,
  beat: f32,
  beatCount: f32,
}

@group(0) @binding(0) var<storage, read> block: FrameBlock;
@group(0) @binding(1) var<storage, read_write> density: array<atomic<u32>>;
@group(0) @binding(2) var linearSampler: sampler;
@group(0) @binding(3) var danceTexture: texture_2d<f32>;

const PI = 3.14159265;

fn aspect() -> f32 {
  return block.resolution.x / block.resolution.y;
}

fn hash(p: vec2<f32>) -> f32 {
  return fract(sin(dot(p, vec2<f32>(127.1, 311.7))) * 43758.5453);
}

fn joint(index: u32) -> vec2<f32> {
  return block.pose[index].xy;
}

fn panel(p: vec2<f32>, index: f32) -> vec2<f32> {
  return vec2<f32>((clamp(p.x, 0.002, 0.998) + index) / 3.0, clamp(p.y, 0.002, 0.998));
}

fn rgb(p: vec2<f32>) -> vec3<f32> {
  return textureSampleLevel(danceTexture, linearSampler, panel(p, 0.0), 0.0).rgb;
}

fn matte(p: vec2<f32>) -> f32 {
  return smoothstep(0.25, 0.75, textureSampleLevel(danceTexture, linearSampler, panel(p, 1.0), 0.0).r);
}

fn deposit(p: vec2<f32>, weight: f32, hue: f32) {
  if (any(p < vec2<f32>(0.0)) || any(p >= vec2<f32>(1.0)) || weight <= 0.0) {
    return;
  }
  let q = vec2<u32>(p * vec2<f32>(DENSITY));
  let i = (q.y * DENSITY.x + q.x) * 2u;
  let w = u32(weight * 256.0);
  atomicAdd(&density[i], w);
  atomicAdd(&density[i + 1u], u32(f32(w) * fract(hue) * 255.0));
}

fn plot(p: vec2<f32>, hue: f32) {
  deposit(p, 1.0, hue);
}
