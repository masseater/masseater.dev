// note: 画面を文字のマスに分け、暗いマスほど画数の多い漢字を、明るいマスほど点や線だけの字を置いて、字の濃さで踊る人を描く。
// glyphs: 　・ー二三王田国輝鬱
void main() {
  vec2 grid = vec2(64.0, 27.0);
  vec2 cell = floor(uv * grid);
  vec2 local = fract(uv * grid);
  float dark = pow(1.0 - luma(rgb((cell + 0.5) / grid)), 1.6);
  float n = 10.0;
  float index = clamp(floor(dark * n), 0.0, n - 1.0);
  float glyph = glyphCell(local, 0, index);
  vec3 c = mix(vec3(0.97, 0.96, 0.92), vec3(0.08), glyph);
  outColor = vec4(c, 1.0);
}
