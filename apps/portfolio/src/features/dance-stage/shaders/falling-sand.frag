// note: 画面の上から 1 粒ずつ砂を降らせ、空いた下や斜め下へ落として積もらせる。踊る人の体は壁として扱うので、砂は頭や腕に積もってこぼれ落ちる。8 秒ごとに空にする。
// pass: sand persistent
uniform sampler2D sand;
vec2 sGrid() { return vec2(240.0, 135.0); }
float filled(vec2 cell) {
  vec2 g = sGrid();
  if (cell.y >= g.y || cell.x < 0.0 || cell.x >= g.x) return 1.0;
  if (cell.y < 0.0) return 0.0;
  vec2 at = (cell + 0.5) / g;
  return max(step(0.5, read(sand, at).r), step(0.5, matte(at)));
}
float grain(vec2 cell) {
  vec2 g = sGrid();
  if (cell.y < 0.0 || cell.x < 0.0 || cell.x >= g.x || cell.y >= g.y) return 0.0;
  return step(0.5, read(sand, (cell + 0.5) / g).r) * (1.0 - step(0.5, matte((cell + 0.5) / g)));
}
void main() {
  vec2 g = sGrid();
  vec2 cell = floor(uv * g);
  vec4 here = read(sand, (cell + 0.5) / g);
  float tick = mod(floor(time * 30.0), 250.0) + 1.0;
  if (floor(here.a * 255.0 + 0.5) == tick) { outColor = here; return; }
  if (fract(time / 8.0) < 0.01) { outColor = vec4(0.0, 0.0, 0.0, tick / 255.0); return; }
  float me = grain(cell);
  float wall = step(0.5, matte((cell + 0.5) / g));
  float next = 0.0;
  if (wall < 0.5) {
    if (me > 0.5) {
      next = filled(cell + vec2(0.0, 1.0)) > 0.5 && (filled(cell + vec2(-1.0, 1.0)) > 0.5 || mod(cell.x + tick, 2.0) < 0.5) && (filled(cell + vec2(1.0, 1.0)) > 0.5 || mod(cell.x + tick, 2.0) > 0.5) ? 1.0 : 0.0;
    } else {
      float above = grain(cell - vec2(0.0, 1.0));
      float fromLeft = grain(cell + vec2(-1.0, -1.0)) * filled(cell + vec2(-1.0, 0.0)) * step(mod(cell.x - 1.0 + tick, 2.0), 0.5) * filled(cell + vec2(-1.0, 1.0) - vec2(0.0, 1.0));
      float fromRight = grain(cell + vec2(1.0, -1.0)) * filled(cell + vec2(1.0, 0.0)) * step(0.5, mod(cell.x + 1.0 + tick, 2.0)) * filled(cell + vec2(1.0, 1.0) - vec2(0.0, 1.0));
      next = max(above, max(fromLeft, fromRight));
      if (cell.y < 1.0 && hash(vec2(cell.x, tick)) > 0.9 && abs(cell.x / g.x - 0.5) < 0.3) next = 1.0;
    }
  }
  outColor = vec4(next, 0.0, 0.0, tick / 255.0);
}
// pass:
uniform sampler2D sand;
void main() {
  vec2 g = vec2(240.0, 135.0);
  float s = step(0.5, read(sand, (floor(uv * g) + 0.5) / g).r);
  vec3 c = rgb(uv);
  vec3 grainColor = vec3(0.9, 0.75, 0.45) * (0.85 + 0.15 * hash(floor(uv * g)));
  outColor = vec4(mix(c, grainColor, s), 1.0);
}
