// note: 今の画と 3 秒前の画を、ゆっくり溶け合わせて入れ替える。途中では二人が重なって見える。
void main() {
  float k = 0.5 - 0.5 * cos(time / 3.0 * PI);
  vec3 c = mix(rgb(uv), pastRgb(uv, time - 3.0), k);
  outColor = vec4(c, 1.0);
}
