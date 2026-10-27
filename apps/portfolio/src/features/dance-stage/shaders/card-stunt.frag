// note: 客席の一席一席が 6 色のカードのどれかを掲げ、全体で今の踊りの絵にする。4 秒ごとに客席の端から順にカードを裏返して掲げ直す。
vec3 card(vec3 c) {
  vec3 palette[6] = vec3[6](vec3(0.95), vec3(0.1), vec3(0.85, 0.15, 0.15), vec3(0.15, 0.3, 0.75), vec3(0.95, 0.8, 0.2), vec3(0.6, 0.45, 0.35));
  vec3 best = palette[0];
  float score = 9.0;
  for (int i = 0; i < 6; i++) {
    vec3 d = palette[i] - c;
    float e = dot(d, d);
    if (e < score) { score = e; best = palette[i]; }
  }
  return best;
}
void main() {
  float y = uv.y;
  float rows = 54.0;
  float row = floor(y * rows);
  float shrink = 0.8 + 0.2 * (row / rows);
  float x = (uv.x - 0.5) / shrink + 0.5;
  vec2 grid = vec2(96.0, rows);
  vec2 seat = vec2(floor(x * grid.x), row);
  vec2 local = vec2(fract(x * grid.x), fract(y * rows));
  float wave = fract(time / 4.0) * 1.6 - seat.x / grid.x * 0.6 - seat.y / grid.y * 0.2;
  vec3 face = card(rgb((seat + 0.5) / grid));
  vec3 back = vec3(0.25, 0.25, 0.3);
  vec3 shown = mix(back, face, step(0.4, wave) + step(wave, 0.0));
  float paper = step(0.08, local.x) * step(local.x, 0.92) * step(0.06, local.y) * step(local.y, 0.86);
  vec3 c = mix(vec3(0.15, 0.15, 0.18), shown, paper * inside(vec2(x, y)));
  outColor = vec4(c, 1.0);
}
