// note: 28.8 秒の踊りを 6 倍の速さで流し、1 秒前までのコマを薄く重ねて、速い動きを流れる軌跡として見せる。
void main() {
  float t = time * 6.0;
  vec3 c = pastRgb(uv, t) * 0.5;
  for (int i = 1; i < 6; i++) {
    c += pastRgb(uv, t - float(i) * 0.2) * 0.1;
  }
  outColor = vec4(c, 1.0);
}
