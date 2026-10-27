// note: 曲の 8 つの帯域から 48 本の棒を作り、踊る人を囲む輪と画面下に並べて伸び縮みさせる。低い音ほど赤く、高い音ほど青い。
float barValue(float x) {
  float f = clamp(x, 0.0, 0.999) * 7.0;
  int i = int(floor(f));
  int j = min(i + 1, 7);
  float v = mix(bands[i], bands[j], fract(f));
  return v * (0.7 + 0.3 * hash(vec2(floor(x * 48.0), floor(time * 12.0))));
}
void main() {
  vec3 c = rgb(uv) * 0.45;
  c = mix(c, rgb(uv), matte(uv));
  float x = uv.x;
  float bar = floor(x * 48.0) / 48.0;
  float v = barValue(bar);
  float on = step(1.0 - uv.y, 0.04 + v * 0.3) * step(0.15, fract(x * 48.0));
  c = mix(c, hsv(vec3(0.66 * bar, 0.8, 1.0)), on);
  vec2 center = bodyCenter() - vec2(0.0, 0.1);
  vec2 d = (uv - center) * vec2(aspect(), 1.0);
  float angle = atan(d.x, -d.y) / (2.0 * PI) + 0.5;
  float slot = floor(angle * 48.0) / 48.0;
  float rv = barValue(abs(slot * 2.0 - 1.0));
  float r = length(d);
  float ring = step(0.32, r) * step(r, 0.32 + 0.04 + rv * 0.14) * step(0.2, fract(angle * 48.0));
  c = mix(c, hsv(vec3(0.66 * abs(slot * 2.0 - 1.0), 0.7, 1.0)), ring * 0.9);
  outColor = vec4(c, 1.0);
}
