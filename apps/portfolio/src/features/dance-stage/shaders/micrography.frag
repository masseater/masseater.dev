// note: 線の代わりに小さな文字の行を敷き詰め、暗い所の文字だけを濃く、太く残す。離れると踊る人が見え、寄ると文章が読める。
// text: 腕を上げて膝を曲げて回る　セイキンダンス　腕を上げて膝を曲げて回る
void main() {
  float line = 0.022;
  float row = floor(uv.y / line);
  float y = fract(uv.y / line);
  float width = line * textAspect(0) / aspect();
  float x = fract((uv.x + row * 0.31) / width);
  float glyph = text(vec2(x, (y - 0.05) / 0.9), 0);
  float dark = 1.0 - luma(blurRgb(uv, 0.004));
  float ink = smoothstep(0.85 - dark * 0.7, 1.0 - dark * 0.7, glyph) * smoothstep(0.15, 0.45, dark);
  outColor = vec4(mix(vec3(0.98, 0.96, 0.9), vec3(0.12, 0.1, 0.18), ink), 1.0);
}
