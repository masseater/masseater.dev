// note: 画面を波で揺らし、青緑に沈め、水面から差す光のゆらめきと泡を重ねて、水の中で踊っているように見せる。
void main() {
  vec2 p = uv + vec2(sin(uv.y * 20.0 + time * 2.0), cos(uv.x * 18.0 + time * 1.7)) * 0.006;
  vec3 c = rgb(p);
  c = c * vec3(0.45, 0.8, 0.95) + vec3(0.0, 0.08, 0.14);
  float caustic = pow(abs(sin(noise(p * 9.0 + time) * 6.0) * cos(noise(p * 7.0 - time * 0.8) * 5.0)), 6.0);
  c += vec3(0.5, 0.8, 0.9) * caustic * 0.35 * (1.0 - uv.y);
  float ray = pow(max(0.0, sin((uv.x + uv.y * 0.3) * 14.0 + time * 0.5)), 12.0) * (1.0 - uv.y);
  c += vec3(0.4, 0.7, 0.8) * ray * 0.15;
  for (int i = 0; i < 12; i++) {
    float fi = float(i);
    vec2 b = vec2(fract(hash(vec2(fi, 2.0)) + 0.03 * sin(time + fi)), 1.0 - fract(time * (0.08 + 0.05 * hash(vec2(fi, 5.0))) + hash(vec2(fi, 9.0))));
    float r = 0.01 + 0.012 * hash(vec2(fi, 3.0));
    float d = dist(uv, b);
    c += vec3(0.8, 0.95, 1.0) * smoothstep(r, r * 0.6, d) * smoothstep(r * 0.3, r * 0.8, d) * 0.6;
  }
  outColor = vec4(c, 1.0);
}
