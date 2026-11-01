// note: 体のまわりの空中に、半透明の水色の表示を重ねる。関節には回る照準を、肩の横には曲の音量から作った数値と波形の窓を浮かべ、未来の道具の画面のように見せる。
void main() {
  vec3 c = rgb(uv) * 0.85;
  vec3 holo = vec3(0.35, 0.9, 1.0);
  int ids[4] = int[4](0, 15, 16, 25);
  for (int i = 0; i < 4; i++) {
    vec2 q = (uv - joint(ids[i])) * vec2(aspect(), 1.0);
    float r = length(q);
    float a = atan(q.y, q.x) + time * (i % 2 == 0 ? 1.5 : -1.5);
    float ring = smoothstep(0.003, 0.0, abs(r - 0.04)) * step(0.3, fract(a / (2.0 * PI) * 4.0));
    c += holo * ring * 0.8;
  }
  vec2 panel = (uv - (joint(12) + vec2(0.06, -0.05))) / vec2(0.2, 0.14);
  if (inside(panel) > 0.5) {
    c = mix(c, holo * 0.3, 0.5);
    float edge = step(panel.x, 0.02) + step(0.98, panel.x) + step(panel.y, 0.03) + step(0.97, panel.y);
    c += holo * min(edge, 1.0) * 0.8;
    float n = number(panel, vec2(0.08, 0.12), 0.4, floor(level * 999.0), 3);
    c += holo * n;
    float wave = 0.78 + 0.12 * sin(panel.x * 30.0 + time * 6.0) * level * 3.0;
    c += holo * smoothstep(0.03, 0.0, abs(panel.y - wave));
  }
  outColor = vec4(c, 1.0);
}
