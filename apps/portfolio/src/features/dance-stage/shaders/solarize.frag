// note: 明るさがある値を超えた所だけ階調を反転し、暗部はそのまま残して輪郭に縁取りを出す。
void main() {
  vec3 c = rgb(uv);
  vec3 s = mix(c, 1.0 - c, step(0.5 + 0.2 * sin(time), c));
  outColor = vec4(s * 1.2, 1.0);
}
