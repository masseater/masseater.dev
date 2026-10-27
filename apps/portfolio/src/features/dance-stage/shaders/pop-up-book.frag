// note: 机の上の絵本を 6 秒ごとに開いて閉じる。開くと見開きの折り目から踊る人の切り抜きが起き上がり、閉じると平らに倒れて収まる。
void main() {
  float phase = fract(time / 6.0);
  float open = smoothstep(0.05, 0.35, phase) * (1.0 - smoothstep(0.75, 0.95, phase));
  vec3 c = mix(vec3(0.55, 0.4, 0.28), vec3(0.42, 0.3, 0.2), uv.y);
  float spreadTop = 0.78 - 0.08 * open;
  float width = 0.42 * mix(0.5, 1.0, open);
  vec2 book = vec2((uv.x - 0.5) / width, (uv.y - spreadTop) / 0.18);
  if (abs(book.x) < 1.0 && book.y > 0.0 && book.y < 1.0) {
    c = mix(vec3(0.96, 0.93, 0.85), vec3(0.85, 0.82, 0.75), (1.0 - abs(book.x)) * 0.15);
    c = mix(c, vec3(0.6, 0.55, 0.5), smoothstep(0.02, 0.0, abs(book.x)));
  }
  float stand = sin(open * PI * 0.5);
  float h = 0.62 * stand;
  vec2 card = vec2((uv.x - 0.5) / 0.35 + 0.56, (uv.y - (spreadTop + 0.06 - h)) / max(h, 0.001));
  float m = matte(card) * inside(card) * step(0.02, stand);
  vec3 figure = rgb(card) * (0.75 + 0.25 * stand);
  c = mix(c, figure, m);
  outColor = vec4(c, 1.0);
}
