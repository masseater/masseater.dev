// note: 5 秒目の画を 1 枚の写真として保存し、その上をゆっくり寄りながら横へなめて動きをつける。
// pass: still persistent
uniform sampler2D still;
void main() {
  vec4 last = read(still, uv);
  outColor = last.a < 0.5 ? vec4(rgb(uv), step(5.0, time)) : last;
}
// pass:
uniform sampler2D still;
void main() {
  float k = fract(time / 8.0);
  float zoom = mix(1.1, 1.6, k);
  vec2 center = mix(vec2(0.35, 0.55), vec2(0.6, 0.4), k);
  vec2 p = (uv - 0.5) / zoom + center;
  outColor = vec4(read(still, p).rgb, 1.0);
}
