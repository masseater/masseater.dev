// note: 回りながら拡大縮小する市松模様の背景、波打って流れる文字、上下に弾む色の横縞を、踊る人と一緒に 1 画面に詰め込む。小さなプログラムで見せ合う作品の定番の組み合わせである。
// glyphs: SEIKINDANCE＊GREET
void main() {
  float zoom = 1.5 + sin(time * 0.7);
  vec2 q = rot((uv - 0.5) * vec2(aspect(), 1.0), time * 0.4) * zoom * 6.0;
  vec3 c = mix(vec3(0.1, 0.05, 0.25), vec3(0.25, 0.1, 0.5), step(0.5, fract(floor(q.x) * 0.5 + floor(q.y) * 0.5)));
  for (int i = 0; i < 3; i++) {
    float y = 0.25 + 0.15 * sin(time * 2.0 + float(i) * 0.8);
    float d = abs(uv.y - y) / 0.02;
    if (d < 1.0) c = hsv(vec3(float(i) / 3.0, 0.7, 1.0)) * (1.0 - d * d);
  }
  c = mix(c, rgb(uv), matte(uv));
  float charW = 0.07;
  float x = uv.x + time * 0.25;
  float slot = floor(x / charW * 0.6);
  float local = fract(x / charW * 0.6);
  float y = 0.86 + 0.04 * sin(slot * 0.6 + time * 4.0);
  float glyph = glyphCell(vec2(local, (uv.y - y) / 0.09 + 0.5), 0, mod(slot, 16.0));
  c = mix(c, hsv(vec3(fract(slot * 0.07 + time * 0.2), 0.6, 1.0)), glyph);
  outColor = vec4(c, 1.0);
}
