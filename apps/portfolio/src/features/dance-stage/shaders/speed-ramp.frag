// note: 再生の速さを 0.3 倍から 1.7 倍のあいだで波のように上げ下げする。速くなる所では動きが流れ、遅くなる所では止まりかける。右下の数字が今の速さ。
void main() {
  float t = time - 0.6 * sin(time * 1.2) / 1.2 * 1.2;
  float speed = 1.0 - 0.72 * cos(time * 1.2);
  vec3 c = pastRgb(uv, t);
  c += (pastRgb(uv, t - 0.06 * speed) - c) * 0.4 * smoothstep(1.0, 1.7, speed);
  float n = number(uv, vec2(0.86, 0.88), 0.07, floor(speed * 10.0), 2);
  c = mix(c, vec3(1.0, 0.85, 0.2), n);
  c = mix(c, vec3(1.0, 0.85, 0.2), step(dist(uv, vec2(0.885, 0.948)), 0.004));
  outColor = vec4(c, 1.0);
}
