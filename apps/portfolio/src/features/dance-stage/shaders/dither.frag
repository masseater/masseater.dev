// note: 4×4 のベイヤー行列で閾値をずらし、白と黒の 2 色だけで濃淡を表す。
float bayer(vec2 p) {
  int x = int(mod(p.x, 4.0));
  int y = int(mod(p.y, 4.0));
  int m[16] = int[16](0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5);
  return (float(m[y * 4 + x]) + 0.5) / 16.0;
}
void main() {
  vec2 cell = floor(uv * resolution / 2.0);
  float l = luma(rgb(cell * 2.0 / resolution));
  float bit = step(bayer(cell), l);
  outColor = vec4(mix(vec3(0.12, 0.1, 0.18), vec3(0.93, 0.95, 0.88), bit), 1.0);
}
