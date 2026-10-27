// note: 3 秒ごとに 1 秒先へ飛ばし、飛ぶ前後の 0.3 秒だけ、2 つの画を互いの位置へ寄せながら混ぜる。インタビューの言いよどみを切った跡を目立たなくするつなぎ方。
void main() {
  float n = floor(time / 3.0);
  float local = time - n * 3.0;
  float t = time + n * 1.0;
  float k = smoothstep(0.0, 0.3, local);
  vec2 warp = vec2(fbm(uv * 3.0 + n) - 0.5, fbm(uv * 3.0 + n + 4.0) - 0.5) * 0.04 * (1.0 - k);
  vec3 before = pastRgb(uv + warp, t - 1.0);
  vec3 after = pastRgb(uv - warp, t);
  outColor = vec4(mix(before, after, k), 1.0);
}
