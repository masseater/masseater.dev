// note: 下半分は、流れている曲の 8 つの帯域の強さを、時間を横に、高さを縦にして右から左へ流すスペクトログラムである。その中に 6 秒ごとに踊る人の切り抜きを 1 列ずつ書き込み、音の図の中に人の姿が浮かぶようにする。
// pass: spectrum persistent
uniform sampler2D spectrum;
void main() {
  float column = 1.0 / resolution.x;
  if (uv.x < 1.0 - column * 2.0) {
    outColor = read(spectrum, uv + vec2(column * 2.0, 0.0));
    return;
  }
  float band = clamp((1.0 - uv.y) * 8.0, 0.0, 7.99);
  int i = int(band);
  int j = min(i + 1, 7);
  float energy = mix(bands[i], bands[j], fract(band));
  float scan = fract(time / 6.0);
  float figure = pastMatte(vec2(0.3 + scan * 0.55, uv.y), floor(time / 6.0) * 6.0);
  outColor = vec4(clamp(energy, 0.0, 1.0), figure, 0.0, 1.0);
}
// pass:
uniform sampler2D spectrum;
void main() {
  vec3 c = rgb(vec2(uv.x, uv.y / 0.5));
  if (uv.y > 0.5) {
    vec4 s = read(spectrum, vec2(uv.x, (uv.y - 0.5) / 0.5));
    float v = max(s.r * 0.8, s.g * 0.9);
    c = vec3(v * 1.6, v * v * 1.2, 0.3 * v + 0.15 * (1.0 - v)) ;
  }
  outColor = vec4(c, 1.0);
}
