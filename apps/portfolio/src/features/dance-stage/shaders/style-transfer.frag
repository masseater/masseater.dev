// note: 映像を渦を巻く短い筆の跡でなぞり、色を夜空の青と星の黄色を中心にした絵の具の色へ寄せて、油絵の画風で描き直す。筆の向きはゆっくり流れる。
vec2 flow(vec2 p) {
  float a = fbm(p * 3.0 + time * 0.05) * 6.0;
  return vec2(cos(a), sin(a));
}
void main() {
  vec3 acc = vec3(0.0);
  vec2 p = uv;
  for (int i = 0; i < 10; i++) {
    acc += rgb(p);
    p += flow(p) * 0.004 * vec2(1.0 / aspect(), 1.0);
  }
  vec3 c = acc / 10.0;
  float l = luma(c);
  vec3 paint = mix(vec3(0.08, 0.15, 0.4), vec3(0.3, 0.5, 0.75), smoothstep(0.1, 0.5, l));
  paint = mix(paint, vec3(0.95, 0.8, 0.3), smoothstep(0.6, 0.9, l));
  c = mix(paint, c, 0.35);
  float stroke = noise(vec2(dot(uv, flow(uv).yx * vec2(-1.0, 1.0)) * 300.0, dot(uv, flow(uv)) * 30.0));
  c *= 0.85 + 0.25 * stroke;
  outColor = vec4(c, 1.0);
}
