// note: 広場を上から見下ろし、180 人の小さな人影がそれぞれの向きと速さで歩くように動かす。中央で踊る人を障害物として避けて流れ、ぶつからずにすれ違う。
void main() {
  vec3 c = mix(vec3(0.75, 0.72, 0.68), vec3(0.68, 0.66, 0.62), step(0.5, fract(uv.x * 12.0) + 0.5 * step(0.5, fract(uv.y * 8.0))) * 0.5);
  vec2 center = vec2(0.5, 0.5);
  vec2 dancer = (uv - center) / 0.42 + vec2(0.56, 0.5);
  float m = matte(dancer) * inside(dancer);
  for (int i = 0; i < 180; i++) {
    float fi = float(i);
    float lane = hash(vec2(fi, 1.0));
    float dir = hash(vec2(fi, 2.0)) < 0.5 ? 1.0 : -1.0;
    float speed = 0.04 + 0.05 * hash(vec2(fi, 3.0));
    float x = fract(hash(vec2(fi, 4.0)) + dir * time * speed);
    vec2 pos = vec2(x, lane);
    vec2 away = (pos - center) * vec2(aspect(), 1.0);
    float push = smoothstep(0.32, 0.0, length(away));
    pos.y += sign(away.y + 0.0001) * push * 0.18;
    float d = dist(uv, pos);
    vec3 shirt = hsv(vec3(hash(vec2(fi, 5.0)), 0.5, 0.85));
    c = mix(c, shirt, smoothstep(0.011, 0.008, d));
    c = mix(c, vec3(0.2, 0.15, 0.1), smoothstep(0.005, 0.003, dist(uv, pos + vec2(dir * 0.004, 0.0))));
  }
  c = mix(c, rgb(dancer), m);
  outColor = vec4(c, 1.0);
}
