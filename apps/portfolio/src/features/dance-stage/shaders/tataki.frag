// note: 両手首のまわりに、白い絵の具をはじいたような点を飛ばして、動きの勢いと光を足す。点は 1 秒 8 回打ち直す。
void main() {
  vec3 c = rgb(uv);
  float step_ = floor(time * 8.0);
  for (int s = 0; s < 2; s++) {
    vec2 w = joint(s == 0 ? 15 : 16);
    for (int i = 0; i < 14; i++) {
      vec2 seed = vec2(float(i) + float(s) * 20.0, step_);
      float a = hash(seed) * 2.0 * PI;
      float r = 0.02 + 0.09 * hash(seed + 1.0);
      vec2 at = w + vec2(cos(a) / aspect(), sin(a)) * r;
      float size = 0.003 + 0.006 * hash(seed + 2.0);
      c = mix(c, vec3(1.0), smoothstep(size, size * 0.5, dist(uv, at)));
    }
  }
  outColor = vec4(c, 1.0);
}
