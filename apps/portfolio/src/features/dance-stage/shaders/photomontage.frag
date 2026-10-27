// note: 新聞紙のような背景の上に、違う瞬間の踊る人を大きさを変えて切り抜いて貼り、1 秒 4 コマでがたがたと動かす。切り抜きには白い縁を残す。
void main() {
  float shot = floor(time * 4.0);
  vec3 c = vec3(0.86, 0.83, 0.75);
  float lines = step(0.6, fract(uv.y * 90.0)) * step(0.3, noise(vec2(uv.x * 40.0, floor(uv.y * 90.0))));
  c = mix(c, vec3(0.45), lines * 0.5);
  c = mix(c, vec3(0.7, 0.15, 0.15), step(abs(uv.y - 0.08), 0.03) * step(0.6, fract(uv.x * 3.0)));
  for (int i = 0; i < 5; i++) {
    float fi = float(i);
    vec2 seed = vec2(fi, shot);
    float size = 0.35 + 0.4 * hash(vec2(fi, 1.0));
    vec2 center = vec2(0.15 + 0.7 * hash(vec2(fi, 2.0)), 0.5) + (vec2(hash(seed), hash(seed + 1.0)) - 0.5) * 0.02;
    vec2 p = rot((uv - center) * vec2(aspect(), 1.0), (hash(vec2(fi, 3.0)) - 0.5) * 0.5) / vec2(aspect(), 1.0) / size + vec2(0.56, 0.5);
    float t = shot / 4.0 + fi * 2.7;
    float m = pastMatte(p, t) * inside(p);
    float rim = pastMatte(p + vec2(0.01, 0.0), t) + pastMatte(p - vec2(0.01, 0.0), t) + pastMatte(p + vec2(0.0, 0.015), t) + pastMatte(p - vec2(0.0, 0.015), t);
    c = mix(c, vec3(0.98), step(0.5, rim) * inside(p) * (1.0 - m));
    c = mix(c, pastRgb(p, t), m);
  }
  outColor = vec4(c, 1.0);
}
