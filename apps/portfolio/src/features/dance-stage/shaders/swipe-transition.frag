// note: 4 秒ごとに手が画面を左から右へ払い、払った跡から次の場面を出す。次の場面は 8 秒先の踊りに青い色を掛けたもので、境目には横向きのぶれを付ける。
void main() {
  float cycle = floor(time / 4.0);
  float t = mod(time, 4.0);
  float k = smoothstep(3.4, 3.9, t);
  float edge = mix(-0.2, 1.2, k);
  vec3 cur = pastRgb(uv, time + mod(cycle, 2.0) * 8.0);
  vec3 nxt = pastRgb(uv, time + mod(cycle + 1.0, 2.0) * 8.0);
  cur = mix(cur, cur * vec3(0.8, 0.95, 1.2), mod(cycle, 2.0));
  nxt = mix(nxt, nxt * vec3(0.8, 0.95, 1.2), mod(cycle + 1.0, 2.0));
  vec3 c = mix(cur, nxt, step(uv.x, edge) * step(0.001, k) * step(k, 0.999));
  vec3 blur = vec3(0.0);
  for (int i = 0; i < 8; i++) blur += rgb(uv - vec2(float(i) * 0.01, 0.0));
  float band = smoothstep(0.15, 0.0, abs(uv.x - edge)) * step(0.001, k) * step(k, 0.999);
  c = mix(c, blur / 8.0 * vec3(0.95, 0.75, 0.6), band);
  outColor = vec4(c, 1.0);
}
