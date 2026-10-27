// note: 動画の 1 場面を止めて暖かい色の少ない絵に変え、髪と服がゆっくり揺れ、雨粒が窓を伝い、湯気が昇り続ける作業用 BGM の一枚絵にする。下には再生中の曲の進み具合を出す。
// text: lofi seikin – beats to dance to
void main() {
  vec2 p = uv;
  float m0 = pastMatte(uv, 11.5);
  p.x += m0 * sin(time * 1.2 + uv.y * 6.0) * 0.002;
  p.y += m0 * sin(time * 0.9) * 0.002;
  vec3 c = pastRgb(p, 11.5);
  c = floor(c * 8.0 + 0.5) / 8.0;
  c = mix(c, c * vec3(1.05, 0.92, 0.8) + vec3(0.04, 0.01, 0.03), 0.6);
  vec2 rp = vec2(uv.x * 40.0, uv.y * 4.0 - time * 0.6);
  float drop = step(0.97, hash(vec2(floor(rp.x), floor(rp.y)))) * step(fract(rp.y), 0.4) * step(abs(fract(rp.x) - 0.5), 0.05);
  c = mix(c, vec3(0.85, 0.9, 1.0), drop * 0.5 * (1.0 - m0));
  float steam = fbm(vec2(uv.x * 6.0, uv.y * 3.0 + time * 0.3)) * smoothstep(0.3, 0.0, dist(uv, vec2(0.82, 0.55))) * 0.6;
  c += vec3(steam);
  c += (hash(uv * resolution + floor(time * 12.0)) - 0.5) * 0.05;
  c = mix(c, vec3(1.0), textBox(uv, vec2(0.5, 0.87), 0.05, 0));
  float bar = step(abs(uv.y - 0.93), 0.003) * step(0.2, uv.x) * step(uv.x, 0.8);
  c = mix(c, vec3(0.5), bar);
  c = mix(c, vec3(1.0), bar * step(uv.x, 0.2 + 0.6 * fract(time / 28.8)));
  outColor = vec4(c, 1.0);
}
