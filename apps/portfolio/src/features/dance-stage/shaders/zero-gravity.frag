// note: 飛行機の中の無重力のように、踊る人が床から浮かんでゆっくり回りながら漂い、まわりの小物も一緒に宙に浮かぶ。壁は白い緩衝材で覆う。
void main() {
  vec3 c = vec3(0.92, 0.92, 0.9) * (0.9 + 0.1 * step(0.5, fract(uv.x * 8.0)) * step(0.5, fract(uv.y * 5.0)));
  c *= 0.85 + 0.15 * smoothstep(0.0, 0.2, min(uv.y, 1.0 - uv.y));
  float a = sin(time * 0.4) * 0.6;
  vec2 drift = vec2(sin(time * 0.3) * 0.08, cos(time * 0.37) * 0.06 - 0.05);
  vec2 q = rot((uv - vec2(0.5) - drift) * vec2(aspect(), 1.0), a) / vec2(aspect(), 1.0) * 1.3 + bodyCenter();
  c = mix(c, rgb(q), matte(q) * inside(q));
  for (int i = 0; i < 6; i++) {
    float fi = float(i);
    vec2 pos = vec2(0.15 + 0.7 * hash(vec2(fi, 1.0)), 0.2 + 0.6 * hash(vec2(fi, 2.0))) + 0.03 * vec2(sin(time * 0.5 + fi), cos(time * 0.6 + fi * 2.0));
    vec2 d = rot((uv - pos) * vec2(aspect(), 1.0), time * (0.3 + fi * 0.1));
    float box = step(abs(d.x), 0.025) * step(abs(d.y), 0.015);
    c = mix(c, hsv(vec3(fi * 0.17, 0.6, 0.85)), box);
  }
  outColor = vec4(c, 1.0);
}
