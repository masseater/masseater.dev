// note: 閉じた本の小口を正面から見る。閉じているあいだは金色の縁だけだが、ページを扇状にずらしたときだけ、ページの端に描いた踊る人が現れる。
void main() {
  float phase = fract(time / 6.0);
  float open = smoothstep(0.2, 0.4, phase) * (1.0 - smoothstep(0.75, 0.95, phase));
  vec2 book = (uv - vec2(0.5, 0.5)) / vec2(0.8, 0.6) + 0.5;
  vec3 c = vec3(0.2, 0.15, 0.12);
  float pages = 160.0;
  float page = floor(book.y * pages);
  float shift = (page / pages - 0.5) * 0.25 * open;
  vec2 q = vec2(book.x + shift, book.y);
  float body = inside(q);
  float line = smoothstep(0.35, 0.5, abs(fract(book.y * pages) - 0.5));
  vec3 gilt = vec3(0.85, 0.68, 0.3) * (0.85 + 0.15 * line);
  vec3 painted = rgb(q) * (0.8 + 0.2 * (1.0 - line));
  c = mix(c, mix(gilt, painted, open), body);
  outColor = vec4(c, 1.0);
}
