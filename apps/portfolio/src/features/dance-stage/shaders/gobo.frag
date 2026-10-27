// note: 光の前に窓枠と木の葉の型を置いたように、部屋と人物に十字の窓の影と、揺れる木漏れ日の影を落とす。
void main() {
  vec3 c = rgb(uv);
  vec2 q = (uv - vec2(0.55, 0.45)) * vec2(1.0, 1.0) + vec2(uv.y * 0.2, 0.0);
  vec2 pane = fract(q * vec2(2.5, 2.0));
  float frame_ = step(pane.x, 0.07) + step(pane.y, 0.07);
  float window = step(abs(q.x), 0.4) * step(abs(q.y), 0.42);
  float leaves = smoothstep(0.45, 0.55, fbm(uv * 6.0 + vec2(sin(time * 0.6) * 0.3, cos(time * 0.4) * 0.2)));
  float light = window * (1.0 - min(frame_, 1.0)) * (1.0 - leaves * 0.8);
  vec3 outc = c * (0.35 + 0.95 * light * vec3(1.05, 0.95, 0.8));
  outColor = vec4(outc, 1.0);
}
