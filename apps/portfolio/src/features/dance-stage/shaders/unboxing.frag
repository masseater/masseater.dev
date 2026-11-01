// note: 上から見た段ボールの箱の中に踊る人を入れておき、6 秒ごとに 4 枚のふたを順に開いて中身を見せ、また閉じる。開いたふたの影が箱の中に落ちる。
void main() {
  float t = mod(time, 6.0);
  vec3 c = vec3(0.75, 0.72, 0.68) * (0.9 + 0.1 * noise(uv * 40.0));
  vec2 lo = vec2(0.25, 0.15);
  vec2 hi = vec2(0.75, 0.85);
  vec2 q = (uv - lo) / (hi - lo);
  bool inBox = q.x > 0.0 && q.x < 1.0 && q.y > 0.0 && q.y < 1.0;
  if (inBox) c = rgb(vec2(0.2 + q.x * 0.6, q.y)) * 0.9;
  float open1 = smoothstep(0.5, 1.2, t) * (1.0 - smoothstep(4.5, 5.2, t));
  float open2 = smoothstep(1.0, 1.7, t) * (1.0 - smoothstep(4.8, 5.5, t));
  vec3 card = vec3(0.78, 0.6, 0.4);
  float leftFlap = step(0.0, q.y) * step(q.y, 1.0) * step(q.x, 0.5 * (1.0 - open1)) * step(-0.5 * open1, q.x);
  float rightFlap = step(0.0, q.y) * step(q.y, 1.0) * step(1.0 - 0.5 * (1.0 - open1), q.x) * step(q.x, 1.0 + 0.5 * open1);
  float topFlap = step(0.0, q.x) * step(q.x, 1.0) * step(q.y, 0.5 * (1.0 - open2)) * step(-0.3 * open2, q.y);
  float botFlap = step(0.0, q.x) * step(q.x, 1.0) * step(1.0 - 0.5 * (1.0 - open2), q.y) * step(q.y, 1.0 + 0.3 * open2);
  c = mix(c, card * 0.95, max(topFlap, botFlap));
  c = mix(c, card, max(leftFlap, rightFlap));
  if (inBox) c *= 1.0 - 0.3 * smoothstep(0.12, 0.0, min(min(q.x, 1.0 - q.x), min(q.y, 1.0 - q.y))) * open1;
  c = mix(c, vec3(0.85, 0.75, 0.5), step(abs(q.y - 0.5), 0.02) * step(0.0, q.x) * step(q.x, 1.0) * (1.0 - open1) * 0.6);
  outColor = vec4(c, 1.0);
}
