// note: 送る側のソフトの窓にカメラの生の映像を、受ける側の窓に人物を切り抜いて模様の上に重ねた映像を並べ、2 つの窓を結ぶ線の上を映像の小さなかけらが流れていくように見せる。
// text: 送信 カメラ
// text: 受信 合成
float win(vec2 p, vec2 a, vec2 b) { return step(a.x, p.x) * step(p.x, b.x) * step(a.y, p.y) * step(p.y, b.y); }
void main() {
  vec3 c = vec3(0.16, 0.17, 0.2);
  vec2 a0 = vec2(0.04, 0.2); vec2 b0 = vec2(0.44, 0.72);
  vec2 a1 = vec2(0.56, 0.2); vec2 b1 = vec2(0.96, 0.72);
  if (win(uv, a0, b0) > 0.0) {
    vec2 q = (uv - a0) / (b0 - a0);
    c = rgb(q);
  }
  if (win(uv, a1, b1) > 0.0) {
    vec2 q = (uv - a1) / (b1 - a1);
    vec3 bg = hsv(vec3(fract(q.x + q.y * 0.5 + time * 0.1), 0.6, 0.8));
    c = mix(bg, rgb(q), matte(q));
  }
  if (win(uv, a0 - vec2(0.0, 0.05), vec2(b0.x, a0.y)) > 0.0) c = vec3(0.3, 0.32, 0.38);
  if (win(uv, a1 - vec2(0.0, 0.05), vec2(b1.x, a1.y)) > 0.0) c = vec3(0.3, 0.32, 0.38);
  c = mix(c, vec3(1.0), textBox(uv, vec2(0.12, a0.y - 0.025), 0.035, 0));
  c = mix(c, vec3(1.0), textBox(uv, vec2(0.64, a1.y - 0.025), 0.035, 1));
  vec2 s = vec2(b0.x, 0.46);
  vec2 e = vec2(a1.x, 0.46);
  c = mix(c, vec3(0.5, 0.8, 1.0), smoothstep(0.003, 0.0, segment(uv, s, e)));
  for (int i = 0; i < 5; i++) {
    float k = fract(time * 0.8 + float(i) * 0.2);
    vec2 p = mix(s, e, k);
    vec2 d = abs(uv - p) * vec2(aspect(), 1.0);
    if (max(d.x, d.y) < 0.018) c = rgb(vec2(0.5) + (uv - p) * 6.0);
  }
  outColor = vec4(c, 1.0);
}
