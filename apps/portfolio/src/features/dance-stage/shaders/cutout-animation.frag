// note: 紙を切り抜いた手足を関節の留め具でつないだ人形にして、骨格の動きに合わせて 1 秒 12 コマで動かす。顔だけは写真の切り抜きを貼る。
void main() {
  vec3 c = vec3(0.92, 0.88, 0.78) * (0.95 + 0.05 * noise(uv * 120.0));
  int bones[24] = int[24](11, 13, 13, 15, 12, 14, 14, 16, 11, 12, 23, 24, 11, 23, 12, 24, 23, 25, 25, 27, 24, 26, 26, 28);
  vec3 colors[3] = vec3[3](vec3(0.75, 0.35, 0.45), vec3(0.25, 0.25, 0.4), vec3(0.85, 0.65, 0.45));
  float torso = 0.0;
  vec2 s1 = joint(11), s2 = joint(12), h1 = joint(23), h2 = joint(24);
  for (int i = 0; i < 12; i++) {
    vec2 a = joint(bones[i * 2]);
    vec2 b = joint(bones[i * 2 + 1]);
    float d = segment(uv, a, b);
    vec3 col = i < 4 ? colors[0] : i < 8 ? colors[0] * 0.95 : colors[1];
    c = mix(c, vec3(0.3, 0.25, 0.2), smoothstep(0.028, 0.024, d) * 0.4);
    c = mix(c, col * (0.92 + 0.08 * noise(uv * 80.0)), smoothstep(0.024, 0.02, d));
  }
  vec2 center = (s1 + s2 + h1 + h2) * 0.25;
  vec2 q = (uv - center) * vec2(aspect(), 1.0);
  float bodyBox = step(abs(q.x), length((s1 - s2) * vec2(aspect(), 1.0)) * 0.5) * step(abs(q.y), abs(h1.y - s1.y) * 0.5);
  c = mix(c, colors[0], bodyBox);
  float head = smoothstep(0.065, 0.06, dist(uv, joint(0)));
  c = mix(c, rgb(uv), head);
  int pins[8] = int[8](11, 12, 13, 14, 23, 24, 25, 26);
  for (int i = 0; i < 8; i++) c = mix(c, vec3(0.8, 0.7, 0.3), smoothstep(0.007, 0.005, dist(uv, joint(pins[i]))));
  outColor = vec4(c, 1.0);
}
