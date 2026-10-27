// note: 動画から 4 秒を切り出して繰り返し、終わりの 0.5 秒で最初の画へ溶かしてつなぐので、どこが切れ目か分からない。右下の輪は 1 周で 1 回分を示し、継ぎ目の印を持たない。
void main() {
  float anchor = 8.0;
  float t = mod(time, 4.0);
  vec3 a = pastRgb(uv, anchor + t);
  vec3 b = pastRgb(uv, anchor + t - 4.0);
  float blend = smoothstep(3.5, 4.0, t);
  vec3 c = mix(a, b, blend);
  vec2 d = (uv - vec2(0.92, 0.88)) * vec2(aspect(), 1.0);
  float r = length(d);
  float ang = atan(d.x, -d.y) / (2.0 * PI) + 0.5;
  float ring = step(abs(r - 0.04), 0.006);
  c = mix(c, vec3(0.3), ring * 0.6);
  c = mix(c, vec3(1.0), ring * step(ang, t / 4.0));
  outColor = vec4(c, 1.0);
}
