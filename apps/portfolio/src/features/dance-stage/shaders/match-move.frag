// note: 体の動きを追う目印を関節に付け、その動きに合わせて、右手首に回る立方体を、頭の上に冠を描き足す。描き足した物は画面の中で体に貼り付いたまま動く。
float cube(vec2 p, vec2 center, float size, float a) {
  float d = 9.0;
  vec3 v[8];
  for (int i = 0; i < 8; i++) {
    vec3 corner = vec3(float(i & 1), float((i >> 1) & 1), float((i >> 2) & 1)) - 0.5;
    corner.xz = rot(corner.xz, a);
    corner.yz = rot(corner.yz, 0.5);
    v[i] = corner;
  }
  for (int i = 0; i < 8; i++) for (int j = 0; j < 8; j++) {
    int diff = i ^ j;
    if (j <= i || (diff != 1 && diff != 2 && diff != 4)) continue;
    d = min(d, segment(p, center + v[i].xy * size / vec2(aspect(), 1.0), center + v[j].xy * size / vec2(aspect(), 1.0)));
  }
  return d;
}
void main() {
  vec3 c = rgb(uv);
  int ids[8] = int[8](0, 11, 12, 15, 16, 23, 24, 27);
  for (int i = 0; i < 8; i++) {
    vec2 d = abs(uv - joint(ids[i])) * vec2(aspect(), 1.0);
    float mark = step(min(d.x, d.y), 0.0015) * step(max(d.x, d.y), 0.012);
    c = mix(c, vec3(0.2, 1.0, 0.3), mark);
  }
  float box = cube(uv, joint(16) + vec2(0.0, -0.07), 0.09, time * 2.0);
  c = mix(c, vec3(0.3, 0.8, 1.0), smoothstep(0.004, 0.001, box));
  vec2 head = joint(0) + vec2(0.0, -0.09);
  vec2 k = (uv - head) * vec2(aspect(), 1.0) / 0.05;
  float crown = step(abs(k.x), 1.0) * step(k.y, 0.4) * step(-0.4 - 0.6 * abs(sin(k.x * PI * 1.5)), k.y);
  c = mix(c, vec3(1.0, 0.82, 0.2), crown);
  outColor = vec4(c, 1.0);
}
