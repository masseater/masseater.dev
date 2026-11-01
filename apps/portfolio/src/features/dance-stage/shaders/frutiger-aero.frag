// note: 青空と緑の丘の上に、つやのある半透明のガラスの板を置いて踊る人を映し、周りに光る水の泡を昇らせる。ガラスの上半分には白い照り返しを重ねる。
void main() {
  vec3 c = mix(vec3(0.95, 1.0, 1.0), vec3(0.3, 0.65, 1.0), 1.0 - uv.y * 1.2);
  float hill = 0.72 + 0.06 * sin(uv.x * 4.0 + 1.0);
  c = mix(c, mix(vec3(0.5, 0.85, 0.3), vec3(0.2, 0.6, 0.2), (uv.y - hill) * 3.0), step(hill, uv.y));
  c += vec3(1.0) * smoothstep(0.5, 0.0, dist(uv, vec2(0.85, 0.1))) * 0.3;
  vec2 lo = vec2(0.25, 0.1);
  vec2 hi = vec2(0.75, 0.88);
  if (uv.x > lo.x && uv.x < hi.x && uv.y > lo.y && uv.y < hi.y) {
    vec2 q = (uv - lo) / (hi - lo);
    vec3 glass = mix(c, rgb(vec2(0.2 + q.x * 0.6, q.y)), 0.8);
    glass += vec3(1.0) * smoothstep(0.5, 0.45, q.y) * 0.15 * smoothstep(0.0, 0.4, q.y);
    c = glass;
  }
  for (int i = 0; i < 10; i++) {
    float fi = float(i);
    vec2 b = vec2(hash(vec2(fi, 1.0)), 1.1 - fract(time * (0.05 + 0.04 * hash(vec2(fi, 2.0))) + hash(vec2(fi, 3.0))) * 1.2);
    b.x += sin(time + fi) * 0.02;
    float r = 0.02 + 0.03 * hash(vec2(fi, 4.0));
    float d = dist(uv, b);
    c = mix(c, vec3(0.8, 0.95, 1.0), smoothstep(0.004, 0.0, abs(d - r)) * 0.8);
    c += vec3(1.0) * smoothstep(r * 0.3, 0.0, dist(uv, b - vec2(r * 0.4 / aspect(), r * 0.4))) * 0.8;
  }
  outColor = vec4(c, 1.0);
}
