// note: 揺れながら少しずつ止まっていく 2 つの振り子でペンを動かしたように、渦を巻いて細っていく幾何学の線を描く。振り子の周期は 6 秒ごとに変わる。WebGPU では compute shader が線の上の 13 万点を打ち、ペンが速く動いたところほどインクが薄くなる。
void main() {
  vec3 c = vec3(0.97, 0.95, 0.9);
  c = mix(c, rgb(uv), 0.25);
#ifdef WEBGPU
  float ink = 0.0;
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      ink += splat(uv + vec2(float(x), float(y)) / resolution).x;
    }
  }
  c = mix(c, vec3(0.15, 0.2, 0.45), clamp(ink * 0.3, 0.0, 1.0));
#else
  float seed = floor(time / 6.0);
  float f1 = 2.0 + floor(hash(vec2(seed, 1.0)) * 3.0) + 0.01;
  float f2 = 3.0 + floor(hash(vec2(seed, 2.0)) * 2.0);
  float draw = fract(time / 6.0) * 600.0;
  float d = 9.0;
  vec2 prev = vec2(0.5);
  for (int i = 0; i < 600; i++) {
    if (float(i) > draw) break;
    float t = float(i) * 0.05;
    float decay = exp(-t * 0.04);
    vec2 p = vec2(sin(t * f1 + 0.5) + sin(t * f2), sin(t * f2 * 1.01) + sin(t * f1 + 1.3)) * 0.2 * decay;
    vec2 at = vec2(0.5 + p.x / aspect(), 0.5 + p.y);
    if (i > 0) d = min(d, segment(uv, prev, at));
    prev = at;
  }
  c = mix(c, vec3(0.15, 0.2, 0.45), smoothstep(0.0022, 0.0006, d));
#endif
  outColor = vec4(c, 1.0);
}
