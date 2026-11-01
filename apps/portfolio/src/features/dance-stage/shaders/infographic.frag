// note: 右に踊りを、左に今の曲の数字を図にして並べる。上は拍の数を大きな数字で、中は 8 つの音域の強さの棒グラフで、下は曲の何割まで進んだかの円で見せる。
void main() {
  vec3 c = vec3(0.97, 0.96, 0.93);
  if (uv.x > 0.45) {
    vec2 p = vec2((uv.x - 0.45) / 0.55 * 0.6 + 0.26, uv.y);
    c = mix(vec3(0.25, 0.55, 0.8), vec3(0.95), matte(p));
  }
  c = mix(c, vec3(0.15, 0.2, 0.3), number(uv, vec2(0.06, 0.06), 0.2, beatCount, 3));
  for (int i = 0; i < 8; i++) {
    float x = 0.05 + float(i) * 0.045;
    float hgt = clamp(bands[i], 0.0, 1.0) * 0.22;
    float bar = step(abs(uv.x - x - 0.015), 0.015) * step(0.6 - hgt, uv.y) * step(uv.y, 0.6);
    c = mix(c, hsv(vec3(0.55 + float(i) * 0.04, 0.6, 0.85)), bar);
  }
  vec2 q = (uv - vec2(0.2, 0.8)) * vec2(aspect(), 1.0);
  float r = length(q);
  float a = atan(q.x, -q.y) / (2.0 * PI) + 0.5;
  float done = mod(time, DURATION) / DURATION;
  float ring = step(abs(r - 0.1), 0.025);
  c = mix(c, mix(vec3(0.85), vec3(0.95, 0.45, 0.2), step(a, done)), ring);
  outColor = vec4(c, 1.0);
}
