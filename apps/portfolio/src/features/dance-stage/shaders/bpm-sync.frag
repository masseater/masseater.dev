// note: 曲の BPM を拍の数から求めて右上に出し、振り子、寄り、色の帯の進みを 1 拍の長さにそろえて動かす。どれも拍の頭で同時に区切りを迎える。
void main() {
  float bpm = beatCount / max(time, 1.0) * 60.0;
  float k = clamp(beat * bpm / 60.0, 0.0, 1.0);
  vec2 p = (uv - 0.5) / (1.0 + 0.06 * (1.0 - k) * (1.0 - k)) + 0.5;
  vec3 c = rgb(p);
  float step8 = mod(beatCount, 8.0);
  float barX = floor(uv.x * 8.0);
  c = mix(c, hsv(vec3(barX / 8.0, 0.7, 1.0)), step(0.95, uv.y) * step(abs(barX - step8), 0.0));
  c = mix(c, vec3(0.2), step(0.95, uv.y) * (1.0 - step(abs(barX - step8), 0.0)) * 0.7);
  float side = mod(beatCount, 2.0) * 2.0 - 1.0;
  float angle = side * cos(k * PI) * 0.5;
  vec2 pivot = vec2(0.12, 0.12);
  vec2 bob = pivot + vec2(sin(angle) / aspect(), cos(angle)) * 0.35;
  c = mix(c, vec3(0.95), smoothstep(0.004, 0.002, segment(uv, pivot, bob)));
  c = mix(c, vec3(1.0, 0.6, 0.2), smoothstep(0.025, 0.02, dist(uv, bob)));
  c = mix(c, vec3(0.0), step(0.75, uv.x) * step(uv.y, 0.12) * 0.5);
  c = mix(c, vec3(1.0), number(uv, vec2(0.78, 0.03), 0.07, floor(bpm), 3));
  outColor = vec4(c, 1.0);
}
