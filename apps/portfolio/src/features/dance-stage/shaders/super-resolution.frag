// note: 境目の左を 64 × 36 画素に落としたぼやけた映像、右を輪郭を立てて細部を描き足した映像にし、境目を左右に動かして見比べる。
// text: 元の解像度
// text: 超解像
void main() {
  float split = 0.5 + 0.3 * sin(time * 0.6);
  vec2 g = vec2(64.0, 36.0);
  vec3 low = rgb((floor(uv * g) + 0.5) / g);
  vec3 sharp = rgb(uv) * 1.8 - blurRgb(uv, 0.004) * 0.8;
  vec3 c = mix(low, clamp(sharp, 0.0, 1.0), step(split, uv.x));
  c = mix(c, vec3(1.0), step(abs(uv.x - split) * aspect(), 0.002));
  c = mix(c, c * 0.3, step(uv.y, 0.11));
  c = mix(c, vec3(1.0), textBox(uv, vec2(split - 0.1, 0.06), 0.04, 0));
  c = mix(c, vec3(1.0), textBox(uv, vec2(split + 0.08, 0.06), 0.04, 1));
  outColor = vec4(c, 1.0);
}
