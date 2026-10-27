// note: 両手首と画面の明るい所を、裏から光を当てたように強く輝かせる。手首には水色の光の玉を持たせ、まわりにぼやけた光をにじませる。
vec3 glowOf(vec2 p, float threshold, float radius) {
  vec3 s = vec3(0.0);
  for (int i = -3; i <= 3; i++) for (int j = -3; j <= 3; j++) {
    vec3 v = rgb(p + vec2(float(i), float(j)) * radius / 3.0 * vec2(1.0 / aspect(), 1.0));
    s += max(v - threshold, 0.0);
  }
  return s / 49.0;
}
void main() {
  vec3 c = rgb(uv) * 0.8;
  c += glowOf(uv, 0.82, 0.03) * vec3(2.0, 2.2, 2.6);
  for (int i = 0; i < 2; i++) {
    float d = dist(uv, joint(i == 0 ? 15 : 16));
    c += vec3(0.4, 0.85, 1.0) * (smoothstep(0.02, 0.0, d) * 1.5 + 0.015 / (d + 0.02));
  }
  outColor = vec4(c, 1.0);
}
