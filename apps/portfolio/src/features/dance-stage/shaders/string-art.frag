// note: 円周の 200 本の釘のあいだに糸を渡していく。毎コマ 16 組の釘を選び、糸の通り道が暗い所を多く通るときだけ渡すので、糸の重なりで顔と体が浮かび上がる。8 秒ごとに張り直す。
// pass: board persistent
uniform sampler2D board;
vec2 pin(float i) {
  float a = i / 200.0 * 2.0 * PI;
  return vec2(0.5 + 0.47 * cos(a) / aspect(), 0.5 + 0.47 * sin(a));
}
void main() {
  vec4 last = read(board, uv);
  float cycle = mod(floor(time / 8.0), 250.0) + 1.0;
  float shade = floor(last.a * 255.0 + 0.5) == cycle ? last.r : 1.0;
  for (int k = 0; k < 16; k++) {
    vec2 seed = vec2(frame, float(k));
    vec2 a = pin(floor(hash(seed) * 200.0));
    vec2 b = pin(floor(hash(seed + 5.3) * 200.0));
    float dark = 0.0;
    for (int s = 1; s < 8; s++) dark += 1.0 - luma(rgb(mix(a, b, float(s) / 8.0)));
    dark /= 7.0;
    if (dark < 0.3) continue;
    shade -= 0.16 * dark * smoothstep(0.0026, 0.0008, segment(uv, a, b));
  }
  outColor = vec4(vec3(max(shade, 0.0)), cycle / 255.0);
}
// pass:
uniform sampler2D board;
void main() {
  float s = read(board, uv).r;
  float ring = dist(uv, vec2(0.5));
  vec3 wood = vec3(0.86, 0.8, 0.7);
  vec3 c = mix(wood, vec3(0.08, 0.06, 0.1), 1.0 - s);
  float pins = step(abs(ring - 0.47), 0.006) * step(0.5, fract(atan(uv.y - 0.5, (uv.x - 0.5) * aspect()) / (2.0 * PI) * 200.0));
  c = mix(c, vec3(0.6, 0.6, 0.65), pins);
  outColor = vec4(c, 1.0);
}
