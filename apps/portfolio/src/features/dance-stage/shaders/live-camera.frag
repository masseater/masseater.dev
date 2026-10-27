// note: 会場の大画面に演者のライブカメラの映像を出し、その場で 4 秒ごとに違う加工を掛ける。手前には観客の頭の影と振られる光る棒を並べ、画面の隅には LIVE の印を灯す。
// text: LIVE
void main() {
  vec3 c = vec3(0.02, 0.02, 0.05);
  vec2 a = vec2(0.15, 0.06);
  vec2 b = vec2(0.85, 0.72);
  if (uv.x > a.x && uv.x < b.x && uv.y > a.y && uv.y < b.y) {
    vec2 q = (uv - a) / (b - a);
    int mode = int(mod(floor(time / 4.0), 4.0));
    vec3 v = rgb(q);
    if (mode == 0) v = vec3(rgb(q + vec2(0.006, 0.0)).r, v.g, rgb(q - vec2(0.006, 0.0)).b);
    else if (mode == 1) v = mix(vec3(luma(v)) * vec3(1.1, 0.5, 0.9), v, matte(q));
    else if (mode == 2) v = rgb(vec2(0.5 - abs(q.x - 0.5), q.y));
    else v = floor(v * 4.0) / 4.0;
    v *= 0.85 + 0.15 * step(0.5, fract(q.y * 200.0));
    c = v;
    vec2 g = abs(q - 0.5);
    float corner = step(0.45, g.x) * step(0.42, g.y) * (step(0.47, g.x) + step(0.47, g.y));
    c = mix(c, vec3(1.0), min(corner, 1.0) * step(g.x, 0.475) * step(g.y, 0.48));
    c = mix(c, vec3(0.9, 0.1, 0.1), step(dist(uv, vec2(0.19, 0.11)), 0.012) * (0.6 + 0.4 * sin(time * 4.0)));
    c = mix(c, vec3(1.0), textBox(uv, vec2(0.24, 0.11), 0.035, 0));
  }
  c += vec3(0.1, 0.1, 0.2) * smoothstep(0.75, 0.6, uv.y) * 0.3;
  float crowd = 0.0;
  for (int i = 0; i < 14; i++) {
    float x = (float(i) + 0.5) / 14.0 + (hash(vec2(float(i), 1.0)) - 0.5) * 0.04;
    float y = 0.84 + hash(vec2(float(i), 2.0)) * 0.05 + sin(time * 4.0 + float(i)) * 0.006;
    crowd = max(crowd, step(dist(uv, vec2(x, y)), 0.045));
    crowd = max(crowd, step(abs(uv.x - x) * aspect(), 0.07) * step(y + 0.03, uv.y));
    vec2 tip = vec2(x + sin(time * 3.0 + float(i) * 1.3) * 0.03, y - 0.14);
    float stick = smoothstep(0.006, 0.002, segment(uv, vec2(x + 0.02, y - 0.02), tip));
    c += hsv(vec3(float(i) * 0.07, 0.7, 1.0)) * stick;
  }
  c = mix(c, vec3(0.0), crowd);
  outColor = vec4(c, 1.0);
}
