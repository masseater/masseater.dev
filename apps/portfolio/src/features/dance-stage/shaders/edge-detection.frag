// note: Sobel フィルタで明るさの変わり目を拾い、白い紙に黒い線で描いた線画にする。
void main() {
  vec2 px = 1.0 / resolution;
  float gx = 0.0;
  float gy = 0.0;
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
    float l = luma(rgb(uv + vec2(x, y) * px * 1.5));
    gx += l * float(x) * (y == 0 ? 2.0 : 1.0);
    gy += l * float(y) * (x == 0 ? 2.0 : 1.0);
  }
  float edge = smoothstep(0.08, 0.35, length(vec2(gx, gy)));
  outColor = vec4(vec3(1.0 - edge) * vec3(0.98, 0.97, 0.94), 1.0);
}
