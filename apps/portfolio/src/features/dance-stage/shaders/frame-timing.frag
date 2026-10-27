// note: 同じ踊りを 3 列に並べ、左から 1 秒 24 枚、12 枚、8 枚の速さで描いたように絵を止めて進める。同じ動きでも、絵を止める長さで滑らかさと勢いが変わる。
void main() {
  float panel = floor(uv.x * 3.0);
  float local = fract(uv.x * 3.0);
  float rate = panel < 0.5 ? 24.0 : panel < 1.5 ? 12.0 : 8.0;
  float t = floor(time * rate) / rate;
  vec2 p = vec2(local * 0.42 + 0.35, uv.y);
  vec3 c = pastRgb(p, t);
  c = mix(c, vec3(0.05), step(local, 0.01) * step(0.5, panel));
  float n = number(vec2(local, uv.y), vec2(0.06, 0.05), 0.1, rate, 2);
  c = mix(c, vec3(0.9, 0.2, 0.2), n);
  outColor = vec4(c, 1.0);
}
