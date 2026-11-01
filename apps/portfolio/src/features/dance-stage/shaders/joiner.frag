// note: ホックニーのフォトコラージュのように、少しずつ傾きと時刻の違う 20 枚の写真を、白い縁付きで重ねて貼り、1 つの場面を組み立てる。
void main() {
  vec3 c = vec3(0.92, 0.9, 0.86);
  for (int i = 0; i < 20; i++) {
    vec2 seed = vec2(float(i), 3.0);
    vec2 center = vec2(0.1 + 0.8 * fract(float(i) * 0.618), 0.12 + 0.76 * fract(float(i) * 0.382 + 0.1));
    vec2 size = vec2(0.24, 0.3) * (0.8 + 0.4 * hash(seed));
    float angle = (hash(seed + 1.0) - 0.5) * 0.25;
    vec2 d = rot((uv - center) * vec2(aspect(), 1.0), angle) / vec2(aspect(), 1.0);
    if (abs(d.x) > size.x * 0.5 || abs(d.y) > size.y * 0.5) continue;
    vec2 p = center + rot(d * vec2(aspect(), 1.0), (hash(seed + 2.0) - 0.5) * 0.08) / vec2(aspect(), 1.0);
    vec3 photo = pastRgb(p, time - hash(seed + 4.0) * 1.5);
    float rim = step(size.x * 0.5 - 0.006, abs(d.x)) + step(size.y * 0.5 - 0.01, abs(d.y));
    c = mix(photo, vec3(0.98), min(rim, 1.0));
  }
  outColor = vec4(c, 1.0);
}
