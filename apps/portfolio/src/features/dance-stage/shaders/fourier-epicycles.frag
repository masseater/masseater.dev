// note: 体の外周を 12 の関節で結んだ閉じた線を、回る円を 7 つつないだ先端で描き直す。円の大きさと向きは、その瞬間の線のフーリエ係数から毎コマ計算する。
vec2 point(int i) {
  int ids[12] = int[12](0, 12, 14, 16, 24, 26, 28, 27, 25, 23, 15, 13);
  return (joint(ids[i]) - 0.5) * vec2(aspect(), 1.0);
}
vec2 coef(int k) {
  vec2 s = vec2(0.0);
  for (int i = 0; i < 12; i++) {
    float a = -2.0 * PI * float(k) * float(i) / 12.0;
    vec2 p = point(i);
    s += vec2(p.x * cos(a) - p.y * sin(a), p.x * sin(a) + p.y * cos(a));
  }
  return s / 12.0;
}
vec2 at(float t, int count, vec2 cs[7], int ks[7]) {
  vec2 s = vec2(0.0);
  for (int k = 0; k < 7; k++) {
    if (k >= count) break;
    float a = 2.0 * PI * float(ks[k]) * t;
    vec2 c = cs[k];
    s += vec2(c.x * cos(a) - c.y * sin(a), c.x * sin(a) + c.y * cos(a));
  }
  return s;
}
void main() {
  int ks[7] = int[7](0, 1, -1, 2, -2, 3, -3);
  vec2 cs[7];
  for (int k = 0; k < 7; k++) cs[k] = coef(ks[k] < 0 ? ks[k] + 12 : ks[k]);
  vec2 p = (uv - 0.5) * vec2(aspect(), 1.0);
  vec3 c = mix(vec3(0.05, 0.06, 0.1), rgb(uv) * 0.25, 1.0);
  float trail = 9.0;
  vec2 prev = at(0.0, 7, cs, ks);
  for (int i = 1; i <= 96; i++) {
    vec2 next = at(float(i) / 96.0, 7, cs, ks);
    trail = min(trail, segment(p, prev, next));
    prev = next;
  }
  c = mix(c, vec3(1.0, 0.85, 0.3), smoothstep(0.004, 0.001, trail));
  float t = fract(time / 4.0);
  vec2 center = cs[0];
  for (int k = 1; k < 7; k++) {
    float r = length(cs[k]);
    c = mix(c, vec3(0.5, 0.75, 1.0), 0.6 * smoothstep(0.003, 0.0, abs(length(p - center) - r)));
    vec2 tip = center + at(t, k + 1, cs, ks) - at(t, k, cs, ks);
    c = mix(c, vec3(0.8, 0.9, 1.0), smoothstep(0.003, 0.001, segment(p, center, tip)));
    center = tip;
  }
  c = mix(c, vec3(1.0), smoothstep(0.012, 0.006, length(p - center)));
  outColor = vec4(c, 1.0);
}
