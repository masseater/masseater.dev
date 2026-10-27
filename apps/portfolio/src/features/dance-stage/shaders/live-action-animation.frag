// note: 実写の踊りの上に、手描きの落書きを乗せる。両手首からは星が飛び、頭の上には揺れる汗、体のまわりには動きを表す線を描き、線は 1 秒 8 回ふるえる。
void main() {
  vec3 c = rgb(uv);
  float boil = floor(time * 8.0);
  vec2 jitter = (vec2(hash(vec2(boil, 1.0)), hash(vec2(boil, 2.0))) - 0.5) * 0.004;
  vec2 p = uv + jitter;
  for (int s = 0; s < 2; s++) {
    vec2 w = joint(s == 0 ? 15 : 16) + vec2(s == 0 ? -0.05 : 0.05, -0.05);
    vec2 q = (p - w) * vec2(aspect(), 1.0);
    float a = atan(q.y, q.x) + time * 2.0;
    float r = length(q);
    float star = 0.03 * (0.6 + 0.4 * cos(a * 5.0));
    c = mix(c, vec3(1.0, 0.85, 0.1), smoothstep(0.003, 0.0, abs(r - star)) + step(r, star) * 0.8);
  }
  vec2 drop = joint(0) + vec2(0.06, -0.08);
  vec2 dq = (p - drop) * vec2(aspect(), 1.0);
  float tear = length(vec2(dq.x, dq.y * 0.7 + abs(dq.x) * 0.6));
  c = mix(c, vec3(0.3, 0.7, 1.0), smoothstep(0.004, 0.0, abs(tear - 0.02)));
  for (int i = 0; i < 3; i++) {
    float y = joint(11).y + 0.05 + float(i) * 0.08;
    float x = min(joint(11).x, joint(12).x) - 0.08 - 0.02 * float(i);
    c = mix(c, vec3(0.1), smoothstep(0.004, 0.001, segment(p, vec2(x - 0.06, y), vec2(x, y))));
  }
  outColor = vec4(c, 1.0);
}
