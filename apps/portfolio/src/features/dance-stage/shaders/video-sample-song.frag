// note: 画面を 9 つのマスに分け、それぞれに踊りの別の瞬間を置く。拍のたびにどれか 1 マスだけが鳴ったように明るくなって動き出し、残りは暗く止まる。
void main() {
  vec2 grid = vec2(3.0, 3.0);
  vec2 cell = floor(uv * grid);
  vec2 local = fract(uv * grid);
  float index = cell.y * 3.0 + cell.x;
  float chosen = floor(hash(vec2(beatCount, 7.0)) * 9.0);
  float on = step(abs(index - chosen), 0.1);
  float start = hash(cell) * DURATION;
  float t = start + on * beat;
  vec2 p = (local - 0.5) * (1.0 - 0.08 * on * exp(-beat * 4.0)) + 0.5;
  vec3 c = pastRgb(p, t) * mix(0.35, 1.15, on);
  float border = step(local.x, 0.012) + step(0.988, local.x) + step(local.y, 0.02) + step(0.98, local.y);
  c = mix(c, mix(vec3(0.05), vec3(1.0, 0.8, 0.2), on), min(border, 1.0));
  outColor = vec4(c, 1.0);
}
