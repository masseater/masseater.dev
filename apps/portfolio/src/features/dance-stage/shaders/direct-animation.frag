// note: カメラを使わず、黒いフィルムを引っかいて描いたように、踊る人の輪郭を白い傷の線にし、まわりに色を塗った形を描く。線は 1 秒 12 回描き直したように揺れる。
void main() {
  float shot = floor(time * 12.0);
  vec2 wob = (vec2(noise(uv * 25.0 + shot), noise(uv * 25.0 - shot)) - 0.5) * 0.006;
  vec2 p = uv + wob;
  float e = 0.004;
  float edge = abs(matte(p + vec2(e, 0.0)) - matte(p - vec2(e, 0.0))) + abs(matte(p + vec2(0.0, e * 1.7)) - matte(p - vec2(0.0, e * 1.7)));
  vec3 c = vec3(0.04, 0.03, 0.03);
  for (int i = 0; i < 5; i++) {
    float fi = float(i);
    vec2 center = vec2(hash(vec2(fi, 1.0)), hash(vec2(fi, 2.0))) + 0.04 * vec2(sin(time + fi), cos(time * 1.3 + fi));
    float blob = smoothstep(0.12, 0.08, dist(uv, center) + (noise(uv * 12.0 + fi + shot * 0.1) - 0.5) * 0.06);
    c = mix(c, hsv(vec3(fi * 0.2, 0.8, 0.85)), blob * 0.8);
  }
  c = mix(c, vec3(0.95, 0.95, 0.9), clamp(edge * 1.5, 0.0, 1.0));
  float scratch = step(0.995, hash(vec2(floor(uv.x * 400.0), shot)));
  c = mix(c, vec3(0.8), scratch);
  float perf = step(fract(uv.y * 10.0), 0.5) * (step(uv.x, 0.025) + step(0.975, uv.x));
  c = mix(c, vec3(0.0), perf);
  outColor = vec4(c, 1.0);
}
