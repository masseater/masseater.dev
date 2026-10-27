// note: 背景に 8 本スポークの車輪を描き、1 秒に 24 コマで撮ったときと同じように時刻を飛び飛びにして回す。実際は速く回っているのに、ゆっくり逆に回って見える。
void main() {
  float t = floor(time * 24.0) / 24.0;
  float angle = t * (2.0 * PI / 8.0) * 23.6;
  vec2 q = (uv - vec2(0.5, 0.5)) * vec2(aspect(), 1.0);
  float r = length(q);
  float a = atan(q.y, q.x) + angle;
  float spoke = smoothstep(0.06, 0.0, abs(sin(a * 4.0)) * r) * step(r, 0.42);
  float rim = smoothstep(0.015, 0.0, abs(r - 0.42));
  float hub = step(r, 0.05);
  vec3 bg = plate(uv) * 0.6;
  bg = mix(bg, vec3(0.95, 0.85, 0.6), max(max(spoke, rim), hub));
  outColor = vec4(person(uv, bg), 1.0);
}
