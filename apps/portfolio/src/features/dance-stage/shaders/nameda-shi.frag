// note: 線が描かれていくように、画面を上から 1 行ずつなめるように現していく。6 秒で全体が現れ、少し見せてから次の画でやり直す。
void main() {
  float phase = fract(time / 6.0);
  float rows = 40.0;
  float row = floor(uv.y * rows);
  float progress = phase * 1.3 * rows;
  float drawn = clamp(progress - row, 0.0, 1.0);
  float show = step(uv.x, drawn);
  vec3 c = mix(vec3(0.97, 0.96, 0.92), rgb(uv), show);
  float pen = step(abs(uv.x - drawn), 0.004) * step(drawn, 0.999) * step(0.001, drawn);
  c = mix(c, vec3(0.1), pen);
  outColor = vec4(c, 1.0);
}
