// note: 踊る人の画を 12 × 7 の破片に割り、4 秒ごとに 1 秒たったところで砕いて、それぞれ違う速さと回転で飛ばし、重力で床へ落とす。床に着いた破片はそこで止まる。
void main() {
  float phase = mod(time, 4.0);
  float t = max(phase - 1.0, 0.0);
  vec2 grid = vec2(12.0, 7.0);
  vec3 c = plate(uv) * 0.85;
  for (int i = 0; i < 84; i++) {
    vec2 cell = vec2(mod(float(i), 12.0), floor(float(i) / 12.0));
    vec2 home = (cell + 0.5) / grid;
    vec2 v = vec2(hash(cell) - 0.5, -hash(cell + 3.1) * 0.8) * 0.9 + (home - vec2(0.5, 0.6)) * 0.8;
    float spin = (hash(cell + 7.7) - 0.5) * 8.0;
    vec2 pos = home + v * t + vec2(0.0, 1.6) * t * t * 0.5;
    pos.y = min(pos.y, 1.0 - 0.5 / grid.y);
    float angle = spin * t;
    vec2 local = rot((uv - pos) * vec2(aspect(), 1.0), -angle) / vec2(aspect(), 1.0);
    vec2 half_ = 0.5 / grid;
    if (abs(local.x) < half_.x && abs(local.y) < half_.y) {
      vec2 at = home + local;
      float edge = step(half_.x - 0.002, abs(local.x)) + step(half_.y - 0.003, abs(local.y));
      c = mix(rgb(at), vec3(0.15), min(edge, 1.0) * step(0.001, t));
    }
  }
  outColor = vec4(c, 1.0);
}
