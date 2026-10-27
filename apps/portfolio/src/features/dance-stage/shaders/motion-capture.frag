// note: 左半分に関節へ反射の印を付けた踊る人を、右半分にその動きを移した丸い部品の CG の体を並べる。左で手を上げると、右の体も同時に同じ形になる。
float capsule(vec2 p, vec2 a, vec2 b, float r) { return segment(p, a, b) - r; }
void main() {
  vec2 shift = vec2(0.25, 0.0);
  vec3 c;
  if (uv.x < 0.5) {
    vec2 p = uv + shift;
    c = rgb(p) * 0.8;
    int ids[12] = int[12](0, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27);
    for (int i = 0; i < 12; i++) {
      float d = dist(p, joint(ids[i]));
      c = mix(c, vec3(1.0), smoothstep(0.012, 0.007, d));
    }
  } else {
    vec2 p = uv - shift;
    c = mix(vec3(0.12, 0.14, 0.2), vec3(0.2, 0.22, 0.3), uv.y);
    vec2 g = fract(vec2(p.x * 10.0, (p.y - 0.5) * 20.0));
    c += vec3(0.05) * step(0.7, uv.y) * step(0.95, max(g.x, g.y));
    float d = 1e3;
    d = min(d, capsule(p, joint(11), joint(13), 0.022));
    d = min(d, capsule(p, joint(13), joint(15), 0.018));
    d = min(d, capsule(p, joint(12), joint(14), 0.022));
    d = min(d, capsule(p, joint(14), joint(16), 0.018));
    d = min(d, capsule(p, joint(23), joint(25), 0.028));
    d = min(d, capsule(p, joint(25), joint(27), 0.022));
    d = min(d, capsule(p, joint(24), joint(26), 0.028));
    d = min(d, capsule(p, joint(26), joint(28), 0.022));
    d = min(d, capsule(p, (joint(11) + joint(12)) * 0.5, (joint(23) + joint(24)) * 0.5, 0.06));
    d = min(d, dist(p, joint(0)) - 0.05);
    vec3 robot = vec3(0.85, 0.55, 0.2) * (0.7 + 0.3 * smoothstep(-0.03, 0.0, -d));
    c = mix(c, robot, smoothstep(0.002, 0.0, d));
    c = mix(c, vec3(0.1), smoothstep(0.003, 0.0, abs(d)) * 0.7);
  }
  c = mix(c, vec3(0.0), step(abs(uv.x - 0.5) * aspect(), 0.003));
  outColor = vec4(c, 1.0);
}
