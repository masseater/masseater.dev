// note: 踊る人の頭と胴と手首の色を拾って 4 台のムービングライトの色にし、拍のたびに光の向きを振り直す。右には各灯の DMX の値を棒で出す。
void main() {
  vec3 c = rgb(uv) * 0.25;
  c = mix(c, rgb(uv) * 0.55, matte(uv));
  vec3 picks[4] = vec3[4](rgb(joint(0)), rgb(bodyCenter()), rgb(joint(15)), rgb(joint(16)));
  for (int i = 0; i < 4; i++) {
    vec3 col = normalize(picks[i] + 0.05) * 1.2;
    vec2 head = vec2(0.15 + float(i) * 0.23, 0.0);
    float target = (hash(vec2(floor(beatCount), float(i))) - 0.5) * 0.9;
    float prev = (hash(vec2(floor(beatCount) - 1.0, float(i))) - 0.5) * 0.9;
    float a = mix(prev, target, smoothstep(0.0, 0.35, beat));
    vec2 d = (uv - head) * vec2(aspect(), 1.0);
    vec2 dir = vec2(sin(a), cos(a));
    float along = dot(d, dir);
    float across = abs(d.x * dir.y - d.y * dir.x);
    float cone = smoothstep(0.03 + along * 0.18, 0.0, across) * step(0.0, along);
    c += col * cone * 0.45;
    c = mix(c, vec3(0.2), step(dist(uv, head), 0.03));
    if (uv.x > 0.9) {
      float lane = floor((uv.x - 0.9) / 0.1 * 4.0);
      if (int(lane) == i) {
        float v = luma(col);
        c = mix(vec3(0.08), col, step(1.0 - uv.y, v * 0.8) * step(0.2, fract((uv.x - 0.9) / 0.1 * 4.0)));
      }
    }
  }
  outColor = vec4(c, 1.0);
}
