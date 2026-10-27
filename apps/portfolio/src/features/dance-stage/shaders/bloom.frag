// note: 明るい所だけを取り出して広くぼかし、元の画に足して光がにじむようにする。
void main() {
  vec3 c = rgb(uv);
  vec3 glow = vec3(0);
  float total = 0.0;
  for (int i = 0; i < 24; i++) {
    float a = float(i) * 2.399;
    float r = sqrt(float(i) / 24.0) * 0.06;
    vec2 o = vec2(cos(a), sin(a)) * r * vec2(resolution.y / resolution.x, 1.0);
    vec3 s = rgb(uv + o);
    glow += max(s - 0.7, 0.0) * 3.0;
    total += 1.0;
  }
  outColor = vec4(c + glow / total * 2.5 * vec3(1.0, 0.9, 1.1), 1.0);
}
