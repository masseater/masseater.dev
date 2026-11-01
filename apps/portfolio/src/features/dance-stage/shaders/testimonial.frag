// note: 踊る人を右寄りに切り出して後ろをぼかしたインタビューの構図にし、左下に名前の帯、左上に括弧付きの感想の字を出す。
// text: 「毎朝これで目が覚めます」
// text: セイキンさん（踊る人）
void main() {
  vec2 p = vec2(uv.x * 0.7 + bodyCenter().x - 0.55, uv.y * 0.7 + 0.05);
  vec3 bg = blurRgb(p, 0.02) * vec3(1.05, 1.0, 0.95);
  vec3 c = mix(bg, rgb(p), matte(p));
  c = mix(c, vec3(0.1, 0.12, 0.2), step(0.04, uv.x) * step(uv.x, 0.42) * step(0.8, uv.y) * step(uv.y, 0.9) * 0.85);
  c = mix(c, vec3(0.95, 0.75, 0.3), step(0.04, uv.x) * step(uv.x, 0.05) * step(0.8, uv.y) * step(uv.y, 0.9));
  c = mix(c, vec3(1.0), textBox(uv, vec2(0.23, 0.85), 0.045, 1));
  c = mix(c, vec3(0.0), textBox(uv + vec2(0.002, -0.003), vec2(0.3, 0.15), 0.06, 0) * 0.6);
  c = mix(c, vec3(1.0), textBox(uv, vec2(0.3, 0.15), 0.06, 0));
  outColor = vec4(c, 1.0);
}
