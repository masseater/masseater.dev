// note: 画面を大きな升目に区切り、升目ごとに 1 色で塗る。升目の大きさを時間で変える。
void main() {
  float size = mix(4.0, 40.0, 0.5 + 0.5 * sin(time * 0.8));
  vec2 grid = resolution / size;
  vec2 p = (floor(uv * grid) + 0.5) / grid;
  outColor = vec4(rgb(p), 1.0);
}
