// note: 1 本の幹が 2 本に分かれる規則を 8 回繰り返して、踊る人の両脇に木を育てる。木は 8 秒かけて伸び、枝の角度は曲の音量で揺れる。
float tree(vec2 p, float growth) {
  vec2 pos = vec2(0.0);
  vec2 dir = vec2(0.0, -1.0);
  float len = 0.22;
  float d = 9.0;
  for (int i = 0; i < 8; i++) {
    float grow = clamp(growth * 8.0 - float(i), 0.0, 1.0);
    vec2 tip = pos + dir * len * grow;
    vec2 pa = p - pos, ba = tip - pos;
    float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-5), 0.0, 1.0);
    d = min(d, length(pa - ba * h) - 0.008 * (1.0 - float(i) / 9.0));
    if (grow < 1.0) break;
    float spread = 0.45 + level * 0.6;
    vec2 left = rot(dir, spread);
    vec2 right = rot(dir, -spread);
    float side = dot(p - tip, vec2(-dir.y, dir.x));
    dir = side > 0.0 ? left : right;
    pos = tip;
    len *= 0.75;
  }
  return d;
}
void main() {
  vec3 c = rgb(uv);
  float growth = fract(time / 8.0);
  vec2 q = (uv - vec2(0.15, 0.98)) * vec2(aspect(), 1.0);
  vec2 r = (uv - vec2(0.88, 0.98)) * vec2(aspect(), 1.0);
  float d = min(tree(q, growth), tree(r, growth));
  c = mix(c, vec3(0.3, 0.2, 0.1), smoothstep(0.003, 0.0, d));
  outColor = vec4(c, 1.0);
}
