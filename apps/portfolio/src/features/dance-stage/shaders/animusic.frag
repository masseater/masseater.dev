// note: 画面下に 8 つの打楽器の台を並べ、帯域ごとの強さで光らせる。拍のたびに 1 つの台から玉が跳ね上がって次の台へ弧を描いて飛ぶので、音を出す仕掛けが音と同時に動いて見える。
void main() {
  vec3 c = mix(rgb(uv) * 0.35, rgb(uv), matte(uv));
  float baseY = 0.9;
  for (int i = 0; i < 8; i++) {
    float x = 0.08 + float(i) * 0.12;
    vec2 q = (uv - vec2(x, baseY)) * vec2(aspect(), 1.0);
    float pad = step(abs(q.x), 0.07) * step(abs(q.y), 0.025);
    vec3 col = hsv(vec3(float(i) / 8.0, 0.7, 0.35 + 0.65 * bands[i]));
    c = mix(c, col, pad);
    c = mix(c, vec3(0.2), step(abs(q.x), 0.012) * step(0.025, q.y) * step(q.y, 0.2) * step(uv.y, 1.0));
  }
  float from = mod(beatCount, 8.0);
  float to = mod(beatCount + 1.0, 8.0);
  float k = clamp(beat / 0.5, 0.0, 1.0);
  vec2 a = vec2(0.08 + from * 0.12, baseY - 0.04);
  vec2 b = vec2(0.08 + to * 0.12, baseY - 0.04);
  vec2 ball = mix(a, b, k) - vec2(0.0, sin(k * PI) * 0.3);
  float d = dist(uv, ball);
  c = mix(c, vec3(1.0, 0.95, 0.85), smoothstep(0.022, 0.018, d));
  c += vec3(1.0, 0.8, 0.4) * exp(-d * 30.0) * 0.4;
  outColor = vec4(c, 1.0);
}
