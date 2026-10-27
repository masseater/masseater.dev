// note: 音楽プレイヤーの画面のように、渦を巻いて流れ続ける色の模様を帯域の強さで脈打たせ、踊る人を光る影として重ねる。下には再生ボタンと進み具合と経過秒を出す。
void main() {
  vec2 p = (uv - 0.5) * vec2(aspect(), 1.0);
  float r = length(p);
  float a = atan(p.y, p.x);
  float v = sin(a * 5.0 + time * 1.5 + sin(r * 10.0 - time * 2.0) * (1.0 + bands[1] * 2.0));
  v += sin(r * 20.0 - time * 3.0 + bands[4] * 4.0);
  vec3 c = hsv(vec3(fract(v * 0.1 + time * 0.05), 0.7, 0.35 + 0.5 * level));
  float m = matte(uv);
  float edge = abs(matte(uv + vec2(0.004, 0.0)) - matte(uv - vec2(0.004, 0.0))) + abs(matte(uv + vec2(0.0, 0.006)) - matte(uv - vec2(0.0, 0.006)));
  c = mix(c, c * 0.25, m);
  c += vec3(1.0) * min(edge, 1.0) * 0.9;
  if (uv.y > 0.88) {
    c = vec3(0.12, 0.12, 0.14);
    vec2 q = (uv - vec2(0.05, 0.94)) * vec2(aspect(), 1.0);
    float play = step(q.x, 0.0 + 0.03) * step(-0.0, q.x + 0.0) * step(abs(q.y), 0.025 - q.x * 0.8);
    c = mix(c, vec3(0.95), play);
    float track = step(abs(uv.y - 0.94), 0.004) * step(0.12, uv.x) * step(uv.x, 0.8);
    c = mix(c, vec3(0.4), track);
    c = mix(c, vec3(0.3, 0.7, 1.0), track * step(uv.x, 0.12 + 0.68 * fract(time / 28.8)));
    c = mix(c, vec3(0.9), number(uv, vec2(0.84, 0.915), 0.05, floor(mod(time, 28.8)), 2));
  }
  outColor = vec4(c, 1.0);
}
