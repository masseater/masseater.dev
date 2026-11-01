// note: 縦に並んだ文字の列が上から流れ落ち、落ちる先頭だけを明るい緑に光らせる。踊る人の形の内側の列は明るく、外側は暗くして、文字の雨の中に人が浮かぶ。
// glyphs: アカサタナハマヤラワヲンセイキダ
void main() {
  float cols = 64.0;
  float rows = 30.0;
  vec2 cell = floor(uv * vec2(cols, rows));
  vec2 local = fract(uv * vec2(cols, rows));
  float speed = 6.0 + 6.0 * hash(vec2(cell.x, 1.0));
  float head = mod(time * speed + hash(vec2(cell.x, 2.0)) * 60.0, rows + 12.0);
  float behind = head - cell.y;
  float tail = step(0.0, behind) * exp(-behind * 0.18);
  float index = floor(hash(cell + floor(time * 4.0 + hash(cell) * 3.0)) * 16.0);
  float glyph = glyphCell(local, 0, index);
  float body = matte((cell + 0.5) / vec2(cols, rows));
  float bright = mix(tail * 0.3, max(tail, 0.55), body);
  vec3 c = vec3(0.0, 0.03, 0.0) + vec3(0.2, 1.0, 0.35) * glyph * bright;
  c = mix(c, vec3(0.85, 1.0, 0.9) * glyph, step(abs(behind), 0.5));
  outColor = vec4(c, 1.0);
}
