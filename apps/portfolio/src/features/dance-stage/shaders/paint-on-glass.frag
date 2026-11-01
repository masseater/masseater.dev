// note: 下から光るガラス板に油絵の具で描いたように、色を筆の塊にまとめて光を透かす。6 秒ごとに絵の具を指で拭ったように渦を巻いて崩れ、次の絵へ描き変わる。
void main() {
  float phase = fract(time / 6.0);
  float swirl = smoothstep(0.7, 1.0, phase) + (1.0 - smoothstep(0.0, 0.2, phase));
  vec2 center = vec2(0.5);
  vec2 q = (uv - center) * vec2(aspect(), 1.0);
  float a = swirl * 3.0 * exp(-length(q) * 2.0);
  vec2 p = rot(q, a) / vec2(aspect(), 1.0) + center;
  vec2 warp = (vec2(fbm(p * 5.0 + time * 0.1), fbm(p * 5.0 + 7.0)) - 0.5) * 0.02;
  vec3 c = blurRgb(p + warp, 0.006);
  c = floor(c * 7.0 + 0.5) / 7.0;
  vec3 glow = vec3(1.0, 0.95, 0.85);
  c = mix(c, c * glow * 1.2, 0.5) * (0.92 + 0.08 * noise(uv * 150.0));
  outColor = vec4(c, 1.0);
}
