// note: 前から読んでも後ろから読んでも同じ文のように、踊りを 2 秒進めてから同じ 2 秒を逆に戻す。下の回文は、今再生している位置に当たる字を光らせる。
// text: たけやぶやけた
void main() {
  float phase = mod(time, 4.0);
  float t = floor(time / 4.0) * 4.0 + (phase < 2.0 ? phase : 4.0 - phase);
  vec3 c = pastRgb(uv, t);
  float h = 0.12;
  vec2 center = vec2(0.5, 0.86);
  float letters = textBox(uv, center, h, 0);
  float width = h * textAspect(0) / aspect();
  float index = floor((uv.x - (center.x - width * 0.5)) / width * 7.0);
  float at = floor(phase / 4.0 * 7.0);
  vec3 ink = mix(vec3(1.0), vec3(1.0, 0.3, 0.4), step(abs(index - at), 0.1));
  c = mix(c, vec3(0.0), textBox(uv - vec2(0.004, 0.006), center, h, 0) * 0.8);
  c = mix(c, ink, letters);
  outColor = vec4(c, 1.0);
}
