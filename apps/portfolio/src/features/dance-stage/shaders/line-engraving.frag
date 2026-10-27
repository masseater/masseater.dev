// note: 陰影を、紙幣の肖像のような細い線の太さだけで表す。線は形に沿って明るさの分だけ曲げ、暗い所ほど太くする。
void main() {
  vec3 src = blurRgb(uv, 0.003);
  float l = luma(src);
  float bend = l * 0.012 + matte(uv) * 0.006 * sin(uv.x * 30.0);
  float lines = abs(fract((uv.y + bend) * 140.0) - 0.5) * 2.0;
  float width = (1.0 - l) * 0.95;
  float ink = smoothstep(width, width - 0.15, lines);
  float cross = abs(fract((uv.x + uv.y * 0.6) * 160.0) - 0.5) * 2.0;
  ink = max(ink, smoothstep(0.35, 0.2, l) * smoothstep(0.4, 0.25, cross));
  vec3 paper = vec3(0.9, 0.93, 0.86);
  outColor = vec4(mix(paper, vec3(0.12, 0.25, 0.2), ink), 1.0);
}
