// note: 人を背景から自動で切り離した結果を見せる。前半 3 秒は人の範囲を半透明の色で塗って名前と確からしさを添え、後半 3 秒は切り抜いた人を夕方の浜辺へ差し替える。
// text: person 0.98
void main() {
  float m = matte(uv);
  float swap = step(3.0, mod(time, 6.0));
  vec3 c = rgb(uv);
  vec3 mask = mix(c * 0.6, mix(c, vec3(0.2, 0.5, 1.0), 0.55), m);
  float edge = abs(matte(uv + vec2(0.003, 0.0)) - matte(uv - vec2(0.003, 0.0))) + abs(matte(uv + vec2(0.0, 0.005)) - matte(uv - vec2(0.0, 0.005)));
  mask = mix(mask, vec3(0.4, 0.8, 1.0), min(edge * 2.0, 1.0));
  vec2 tag = joint(0) - vec2(0.0, 0.14);
  mask = mix(mask, vec3(0.2, 0.5, 1.0), step(abs(uv.x - tag.x) * aspect(), 0.11) * step(abs(uv.y - tag.y), 0.025));
  mask = mix(mask, vec3(1.0), textBox(uv, tag, 0.035, 0));
  vec3 sky = mix(vec3(1.0, 0.6, 0.4), vec3(0.4, 0.5, 0.8), uv.y * -1.0 + 0.8);
  vec3 sea = vec3(0.15, 0.3, 0.5) + 0.1 * sin(uv.x * 60.0 + time * 2.0) * step(0.62, uv.y);
  vec3 beach = mix(sky, sea, step(0.55, uv.y));
  beach = mix(beach, vec3(0.9, 0.8, 0.6), step(0.78, uv.y));
  vec3 swapped = mix(beach, c, m);
  c = mix(mask, swapped, swap);
  outColor = vec4(c, 1.0);
}
