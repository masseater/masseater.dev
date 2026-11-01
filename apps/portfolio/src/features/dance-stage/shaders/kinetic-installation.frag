// note: 踊る人の頭上に 16 × 6 個の金属の玉を糸で吊り、それぞれの高さを機械で上下させて、波や斜面の形へ順に変えていく。玉には上からの光の照り返しを付ける。
void main() {
  vec3 c = rgb(uv) * 0.5;
  c = mix(c, rgb(uv), matte(uv));
  float mode = floor(mod(time / 5.0, 3.0));
  for (int j = 0; j < 6; j++) {
    for (int i = 0; i < 16; i++) {
      float fi = float(i) / 15.0;
      float fj = float(j) / 5.0;
      float h;
      if (mode < 0.5) h = 0.5 + 0.5 * sin(fi * 6.0 + time * 1.5);
      else if (mode < 1.5) h = 0.5 + 0.5 * sin(length(vec2(fi - 0.5, fj - 0.5)) * 10.0 - time * 2.0);
      else h = fract(fi + fj * 0.5 + time * 0.2);
      float depth = 0.6 + fj * 0.4;
      vec2 pos = vec2(0.5 + (fi - 0.5) * 0.85 * depth, 0.08 + h * 0.3 * depth + fj * 0.05);
      float r = 0.012 * depth;
      float d = dist(uv, pos);
      vec3 ball = vec3(0.6, 0.6, 0.65) * (0.5 + 0.5 * smoothstep(r, 0.0, dist(uv, pos - vec2(0.003, 0.004)))) + vec3(1.0) * smoothstep(r * 0.4, 0.0, dist(uv, pos - vec2(0.003, 0.005))) * 0.7;
      c = mix(c, ball, smoothstep(r, r * 0.8, d));
      c = mix(c, vec3(0.6), step(abs(uv.x - pos.x) * aspect(), 0.0006) * step(uv.y, pos.y) * 0.4);
    }
  }
  outColor = vec4(c, 1.0);
}
