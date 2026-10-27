// note: 踊る人を 1 色の平らな形にし、まわりで丸や四角や三角が拍に合わせて弾んで伸び縮みする。影もぼかしも使わない、平らな色の図形だけの画にする。
void main() {
  vec3 bg = vec3(0.98, 0.93, 0.82);
  vec3 c = bg;
  float pop = 1.0 + 0.35 * exp(-beat * 6.0);
  vec2 q = (uv - vec2(0.2, 0.3)) * vec2(aspect(), 1.0);
  c = mix(c, vec3(0.95, 0.4, 0.35), step(length(q), 0.12 * pop));
  vec2 s = rot((uv - vec2(0.82, 0.25)) * vec2(aspect(), 1.0), beatCount * 0.785);
  c = mix(c, vec3(0.25, 0.55, 0.85), step(max(abs(s.x), abs(s.y)), 0.09 * pop));
  vec2 t = (uv - vec2(0.8, 0.75)) * vec2(aspect(), 1.0) / pop;
  float tri = step(-0.1, t.y) * step(abs(t.x) * 1.7, 0.1 - t.y) * step(t.y, 0.1);
  c = mix(c, vec3(1.0, 0.75, 0.2), tri);
  vec2 b = (uv - vec2(0.18, 0.8)) / vec2(0.18 * pop, 0.03);
  c = mix(c, vec3(0.3, 0.7, 0.5), step(max(abs(b.x), abs(b.y)), 1.0));
  c = mix(c, vec3(0.2, 0.2, 0.35), step(0.5, matte(uv)));
  outColor = vec4(c, 1.0);
}
