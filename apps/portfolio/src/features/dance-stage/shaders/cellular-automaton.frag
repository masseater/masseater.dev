// note: 画面を 160×90 のマスに分け、ライフゲームの規則で毎秒 10 回、周りの 8 マスだけを見て次の生死を決める。最初の状態は 6 秒ごとに踊る人の形から作り直す。
// pass: life persistent
uniform sampler2D life;
float alive(vec2 cell, vec2 grid) { return step(0.5, read(life, (cell + 0.5) / grid).r); }
void main() {
  vec2 grid = vec2(160.0, 90.0);
  vec2 cell = floor(uv * grid);
  vec4 here = read(life, (cell + 0.5) / grid);
  float tick = mod(floor(time * 10.0), 250.0) + 1.0;
  if (floor(here.a * 255.0 + 0.5) == tick) { outColor = here; return; }
  float state = step(0.5, here.r);
  if (fract(time / 6.0) < 0.02) state = step(0.5, matte((cell + 0.5) / grid)) * step(0.4, hash(cell + floor(time)));
  else {
    float n = 0.0;
    for (int i = -1; i <= 1; i++) for (int j = -1; j <= 1; j++) {
      if (i == 0 && j == 0) continue;
      n += alive(mod(cell + vec2(float(i), float(j)), grid), grid);
    }
    state = state > 0.5 ? step(1.5, n) * step(n, 3.5) : step(2.5, n) * step(n, 3.5);
  }
  outColor = vec4(state, here.g * 0.9 + state * 0.1, 0.0, tick / 255.0);
}
// pass:
uniform sampler2D life;
void main() {
  vec2 grid = vec2(160.0, 90.0);
  vec4 s = read(life, (floor(uv * grid) + 0.5) / grid);
  vec3 c = mix(vec3(0.05, 0.06, 0.1), vec3(0.3, 0.9, 0.6), s.r);
  c += vec3(0.1, 0.2, 0.4) * s.g;
  vec2 local = fract(uv * grid);
  c *= 0.75 + 0.25 * step(0.12, min(local.x, local.y));
  outColor = vec4(c, 1.0);
}
