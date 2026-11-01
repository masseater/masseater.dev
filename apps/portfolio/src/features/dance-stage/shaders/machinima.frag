// note: 踊る人と部屋をゲームのエンジンで描いたような平らな陰の段と太い輪郭に変え、上下に黒い帯を入れて、映像作品の字幕を出す。
// text: ――あの日、彼は踊ることを選んだ。
void main() {
  vec3 base = rgb(uv);
  float l = luma(base);
  vec3 c = base / max(l, 0.05) * (floor(l * 4.0 + 0.5) / 4.0);
  c = mix(c, vec3(luma(c)), 0.2) * vec3(1.0, 0.95, 1.05);
  vec2 e = vec2(1.5 / resolution.x, 1.5 / resolution.y);
  float gx = luma(rgb(uv + vec2(e.x, 0.0))) - luma(rgb(uv - vec2(e.x, 0.0)));
  float gy = luma(rgb(uv + vec2(0.0, e.y))) - luma(rgb(uv - vec2(0.0, e.y)));
  c = mix(c, vec3(0.05), smoothstep(0.08, 0.2, length(vec2(gx, gy))));
  c *= step(0.1, uv.y) * step(uv.y, 0.9);
  c = mix(c, vec3(1.0), textBox(uv, vec2(0.5, 0.95), 0.04, 0));
  outColor = vec4(c, 1.0);
}
