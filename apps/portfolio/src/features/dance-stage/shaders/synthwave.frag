// note: 夜の地平に横縞の入った夕日を沈め、手前にはネオンの格子の地面を手前へ流し続ける。踊る人は濃い紫に沈め、輪郭だけを桃色のネオンで光らせる。
void main() {
  vec3 c = mix(vec3(0.05, 0.0, 0.15), vec3(0.6, 0.1, 0.45), smoothstep(0.0, 0.62, uv.y));
  vec2 sd = (uv - vec2(0.5, 0.48)) * vec2(aspect(), 1.0);
  float stripe = step(0.3, fract(uv.y * 26.0)) + step(uv.y, 0.4);
  float sun = step(length(sd), 0.2) * min(stripe, 1.0) * step(uv.y, 0.62);
  c = mix(c, mix(vec3(1.0, 0.85, 0.2), vec3(1.0, 0.2, 0.55), smoothstep(0.3, 0.6, uv.y)), sun);
  if (uv.y > 0.62) {
    float depth = (uv.y - 0.62) / 0.38;
    vec2 g = vec2((uv.x - 0.5) / depth, 1.0 / depth + time * 1.2);
    float line = smoothstep(0.08, 0.0, abs(fract(g.x * 3.0) - 0.5) - 0.42) + smoothstep(0.1, 0.0, abs(fract(g.y) - 0.5) - 0.42);
    c = vec3(0.04, 0.0, 0.08) + vec3(0.2, 0.6, 1.0) * min(line, 1.0) * (0.3 + depth);
  }
  float m = matte(uv);
  float edge = abs(matte(uv + vec2(0.003, 0.0)) - matte(uv - vec2(0.003, 0.0))) + abs(matte(uv + vec2(0.0, 0.005)) - matte(uv - vec2(0.0, 0.005)));
  c = mix(c, rgb(uv) * vec3(0.4, 0.2, 0.6), m);
  c += vec3(1.0, 0.3, 0.8) * min(edge, 1.0) * 1.2;
  outColor = vec4(c, 1.0);
}
