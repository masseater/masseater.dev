// note: 90 年代の CG のような青緑の市松模様と水面の光の揺らぎを背景にし、イルカの影を弧を描いて跳ばせる。踊る人は青緑と紫のネオンの色に染める。
void main() {
  vec2 p = uv * vec2(aspect(), 1.0) * 6.0;
  float check = mod(floor(p.x + time * 0.3) + floor(p.y), 2.0);
  vec3 c = mix(vec3(0.0, 0.5, 0.55), vec3(0.3, 0.1, 0.5), check);
  float caustic = pow(abs(sin(fbm(uv * 8.0 + time * 0.3) * 12.0)), 8.0);
  c += vec3(0.5, 1.0, 0.95) * caustic * 0.5;
  for (int i = 0; i < 2; i++) {
    float t = fract(time / 3.0 + float(i) * 0.5);
    vec2 center = vec2(0.15 + float(i) * 0.65 + t * 0.2, 0.75 - sin(t * PI) * 0.35);
    float angle = (t - 0.5) * 2.0;
    vec2 q = rot((uv - center) * vec2(aspect(), 1.0), angle);
    float body = step(length(q / vec2(0.09, 0.03)), 1.0);
    float fin = step(abs(q.x + 0.0), 0.02) * step(-0.06, q.y) * step(q.y, -0.02) * step(q.x, 0.02 + q.y);
    float tail = step(length((q - vec2(-0.1, 0.0)) / vec2(0.02, 0.04)), 1.0);
    c = mix(c, vec3(0.1, 0.2, 0.4), min(body + fin + tail, 1.0));
  }
  float l = luma(rgb(uv));
  vec3 neon = mix(vec3(0.3, 0.0, 0.6), vec3(0.2, 1.0, 0.9), l);
  c = mix(c, neon, matte(uv));
  outColor = vec4(c, 1.0);
}
