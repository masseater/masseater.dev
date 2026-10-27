// note: 曲の音量と 8 つの帯域の強さで、人物の光り方と下の棒の高さを動かす。拍の瞬間には画面全体が一瞬だけ寄る。
void main() {
  vec2 center = vec2(0.5);
  vec2 p = (uv - center) / (1.0 + 0.08 * exp(-beat * 7.0)) + center;
  vec3 c = rgb(p);
  float m = matte(p);
  vec3 glow = hsv(vec3(fract(beatCount * 0.13), 0.75, 1.0));
  c = mix(c * (0.45 + 0.4 * level), c + glow * 0.6 * level, m);
  int band = int(clamp(uv.x * 8.0, 0.0, 7.0));
  float bar = step(1.0 - uv.y, bands[band] * 0.3) * step(0.08, fract(uv.x * 8.0));
  c = mix(c, glow, bar * 0.8);
  outColor = vec4(c, 1.0);
}
