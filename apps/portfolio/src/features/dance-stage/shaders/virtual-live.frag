// note: 奥に生バンドの影を照明の中に並べ、手前の透明な幕に輪郭を立てた CG 風の踊る人を映す。幕の細かな網目越しに、奥の演奏者が透けて見える。
void main() {
  vec3 c = vec3(0.02, 0.01, 0.05);
  for (int i = 0; i < 3; i++) {
    float x = 0.2 + float(i) * 0.3;
    vec3 col = hsv(vec3(0.6 + float(i) * 0.12, 0.7, 1.0));
    float beam = smoothstep(0.12 + uv.y * 0.15, 0.0, abs(uv.x - x)) * uv.y;
    c += col * beam * 0.3;
    vec2 q = (uv - vec2(x, 0.72)) * vec2(aspect(), 1.0);
    float body = step(length(q - vec2(0.0, -0.08)), 0.035) + step(abs(q.x), 0.05) * step(-0.05, q.y) * step(q.y, 0.15);
    c = mix(c, vec3(0.0), min(body, 1.0));
  }
  c = mix(c, vec3(0.05), step(abs(uv.x - 0.5), 0.07) * step(0.8, uv.y) * step(uv.y, 0.88));
  vec3 toon = floor(rgb(uv) * 4.0 + 0.5) / 4.0;
  toon *= vec3(0.9, 1.0, 1.15);
  float m = matte(uv);
  float edge = abs(matte(uv + vec2(0.003, 0.0)) - matte(uv - vec2(0.003, 0.0))) + abs(matte(uv + vec2(0.0, 0.005)) - matte(uv - vec2(0.0, 0.005)));
  c = mix(c, toon * 1.1, m * 0.85);
  c += vec3(0.5, 0.9, 1.0) * min(edge, 1.0) * 0.8;
  vec2 mesh = fract(uv * resolution / 3.0);
  c *= 0.85 + 0.15 * step(0.4, min(mesh.x, mesh.y));
  outColor = vec4(c, 1.0);
}
