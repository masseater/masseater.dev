// note: 切り抜きのマスクで人物と背景を分け、背景だけを丸い絞りの形で強くぼかす。
void main() {
  vec3 bg = vec3(0);
  for (int i = 0; i < 48; i++) {
    float a = float(i) * 2.399;
    float r = sqrt(float(i) / 48.0) * 0.045;
    vec2 o = vec2(cos(a), sin(a)) * r * vec2(resolution.y / resolution.x, 1.0);
    vec3 s = mix(rgb(uv + o), plate(uv + o), matte(uv + o));
    bg += s * (1.0 + 2.0 * step(0.85, luma(s)));
  }
  bg /= 48.0 * 1.1;
  outColor = vec4(mix(bg, rgb(uv), matte(uv)), 1.0);
}
