// note: 6 秒ごとに 3 秒間だけ時間を 4 分の 1 に遅くし、その間は色を抜いて周りを暗くし、頭に照準を重ねる。下の集中の目盛りは遅い間に減り、戻ると回復する。
void main() {
  float t = mod(time, 6.0);
  float slow = step(3.0, t);
  float seg = floor(time / 6.0) * 6.0;
  float played = mix(time, seg + 3.0 + (t - 3.0) * 0.25, slow);
  vec3 c = pastRgb(uv, played);
  c = mix(c, vec3(luma(c)) * vec3(0.85, 0.95, 1.1), slow * 0.7);
  c *= 1.0 - slow * 0.5 * smoothstep(0.3, 0.7, length(uv - 0.5));
  vec2 head = joint(0);
  float d = dist(uv, head);
  float reticle = smoothstep(0.003, 0.0, abs(d - 0.05)) + step(abs(uv.x - head.x) * aspect(), 0.0015) * step(abs(uv.y - head.y), 0.08) * step(0.02, abs(uv.y - head.y)) + step(abs(uv.y - head.y), 0.0025) * step(abs(uv.x - head.x) * aspect(), 0.08) * step(0.02, abs(uv.x - head.x) * aspect());
  c = mix(c, vec3(1.0, 0.3, 0.2), min(reticle, 1.0) * slow);
  float meter = mix(1.0, 1.0 - (t - 3.0) / 3.0, slow);
  meter = mix(meter, t / 3.0, 1.0 - slow);
  float bar = step(abs(uv.y - 0.93), 0.008) * step(0.35, uv.x) * step(uv.x, 0.65);
  c = mix(c, vec3(0.2), bar);
  c = mix(c, vec3(0.3, 0.8, 1.0), bar * step(uv.x, 0.35 + 0.3 * meter));
  outColor = vec4(c, 1.0);
}
