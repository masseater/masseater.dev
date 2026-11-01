// note: 切り抜きのマスクを体温の代わりにし、人物を熱く、背景を冷たくしてサーモグラフィの色の帯で塗る。
vec3 thermal(float t) {
  return clamp(vec3(1.5 * t - 0.2, 2.0 * t - 1.0 + 0.5 * sin(t * PI), 1.0 - 2.0 * t + 0.6 * smoothstep(0.85, 1.0, t)), 0.0, 1.0);
}
void main() {
  float heat = 0.25 * luma(rgb(uv)) + 0.7 * matte(uv) * (0.75 + 0.25 * luma(rgb(uv)));
  float blur = 0.0;
  for (int i = 0; i < 8; i++) blur += matte(uv + 0.01 * vec2(cos(float(i)), sin(float(i))));
  heat = max(heat, blur / 8.0 * 0.6);
  outColor = vec4(thermal(heat), 1.0);
}
