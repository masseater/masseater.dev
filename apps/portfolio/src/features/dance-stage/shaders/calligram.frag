// note: 人物の形の内側だけに文章を流し込み、形の輪郭で行の長さが決まるようにする。文字の並びそのものが踊る人の形になる。
// text: セイキンダンス　腕を上げて　膝を曲げて　くるっと回って　また腕を上げる
void main() {
  float line = 0.045;
  float row = floor(uv.y / line);
  float y = fract(uv.y / line);
  float width = line * textAspect(0) / aspect();
  float x = fract((uv.x + row * 0.137) / width);
  float glyph = text(vec2(x, (y - 0.1) / 0.8), 0);
  float m = matte(uv);
  vec3 ink = mix(vec3(0.1, 0.12, 0.3), vec3(0.55, 0.15, 0.15), step(0.5, fract(row * 0.5)));
  vec3 c = mix(vec3(0.98, 0.96, 0.9), ink, glyph * step(0.5, m));
  outColor = vec4(c, 1.0);
}
