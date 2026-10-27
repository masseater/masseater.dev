// note: 姿勢推定で取った右手首を光源にし、画面の中心を挟んだ反対側へ並ぶゴーストと光の筋を足す。
void main() {
  vec2 light = joint(16);
  vec3 c = rgb(uv) * 0.85;
  vec2 aspect = vec2(resolution.x / resolution.y, 1.0);
  vec2 d = (uv - light) * aspect;
  c += vec3(1.0, 0.9, 0.7) * 0.06 / (length(d) + 0.02);
  c += vec3(1.0, 0.8, 0.5) * 0.4 * smoothstep(0.02, 0.0, abs(d.y)) * smoothstep(0.8, 0.0, abs(d.x));
  vec2 axis = vec2(0.5) - light;
  for (int i = 1; i <= 5; i++) {
    vec2 g = light + axis * (0.4 * float(i));
    float r = 0.02 + 0.015 * float(i);
    float ring = smoothstep(r, r * 0.7, length((uv - g) * aspect));
    c += hsv(vec3(0.1 * float(i), 0.6, 0.25)) * ring;
  }
  outColor = vec4(c, 1.0);
}
