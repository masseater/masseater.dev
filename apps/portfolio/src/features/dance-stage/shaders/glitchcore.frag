// note: 画面を横の帯と四角い塊に分けてでたらめにずらし、色の 3 原色を大きく引きはがして彩度を上げ、粒の粗い雑音を重ねる。拍ごとにずれ方を変える。
void main() {
  float seed = floor(beatCount) + floor(time * 6.0) * 0.1;
  vec2 p = uv;
  float row = floor(uv.y * 24.0);
  p.x += (hash(vec2(row, seed)) - 0.5) * 0.12 * step(0.6, hash(vec2(row, seed + 1.0)));
  vec2 blk = floor(uv * vec2(12.0, 8.0));
  p += (vec2(hash(blk + seed), hash(blk + seed + 5.0)) - 0.5) * 0.08 * step(0.85, hash(blk + seed + 9.0));
  float split = 0.015 + 0.02 * exp(-beat * 6.0);
  vec3 c = vec3(rgb(p + vec2(split, 0.0)).r, rgb(p).g, rgb(p - vec2(split, 0.003)).b);
  float l = luma(c);
  c = clamp(mix(vec3(l), c, 2.2), 0.0, 1.0);
  c += (hash(floor(uv * resolution / 3.0) + seed) - 0.5) * 0.25;
  c = mix(c, hsv(vec3(fract(seed * 0.37), 1.0, 1.0)) * c * 1.5, step(0.9, hash(vec2(row, seed + 3.0))));
  outColor = vec4(c, 1.0);
}
