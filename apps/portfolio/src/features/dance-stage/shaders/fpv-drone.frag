// note: 小型ドローンが部屋に飛び込んで人物の脇をすり抜けるように、傾きながら一気に寄り、魚眼で縁を歪め、速さに応じて前後にぶらす。
void main() {
  float phase = fract(time / 6.0);
  float z = mix(0.7, 3.0, smoothstep(0.0, 1.0, phase));
  vec2 target = mix(vec2(0.5, 0.6), joint(12) + vec2(0.1, 0.0), smoothstep(0.2, 1.0, phase));
  float bank = 0.5 * sin(phase * PI * 2.0);
  vec2 q = (uv - 0.5) * vec2(aspect(), 1.0);
  q *= 1.0 + 0.5 * dot(q, q);
  q = rot(q, bank);
  vec3 c = vec3(0);
  for (int i = 0; i < 8; i++) {
    float zz = z * (1.0 + float(i) * 0.012);
    vec2 p = q / vec2(aspect(), 1.0) / zz + target;
    c += rgbOr(p, vec3(0.1, 0.12, 0.15));
  }
  outColor = vec4(c / 8.0, 1.0);
}
