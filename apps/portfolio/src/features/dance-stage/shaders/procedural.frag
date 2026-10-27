// note: 乱数を重ねた式から山並みと雲を作り、横へ流れ続ける終わりのない景色にする。踊る人はいちばん手前の丘の上に立ち、景色だけが流れ去る。
void main() {
  float x = uv.x + time * 0.06;
  vec3 c = mix(vec3(0.98, 0.8, 0.6), vec3(0.45, 0.6, 0.85), 1.0 - uv.y * 1.2);
  float cloud = smoothstep(0.55, 0.75, fbm(vec2(x * 3.0 + time * 0.02, uv.y * 6.0))) * step(uv.y, 0.4);
  c = mix(c, vec3(1.0), cloud * 0.8);
  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    float speed = 0.5 + fi * 0.6;
    float h = 0.4 + fi * 0.15 + 0.15 * fbm(vec2((uv.x + time * 0.06 * speed) * (2.0 + fi), fi * 5.0));
    vec3 land = mix(vec3(0.4, 0.5, 0.6), vec3(0.2, 0.4, 0.2), fi / 2.0);
    c = mix(c, land * (0.9 + 0.1 * noise(uv * 50.0)), step(h, uv.y));
  }
  float hill = 0.88 - 0.05 * exp(-pow((uv.x - 0.5) * 4.0, 2.0));
  c = mix(c, vec3(0.25, 0.45, 0.2), step(hill, uv.y));
  vec2 p = (uv - vec2(0.5, 0.48)) / 0.75 + vec2(0.56, 0.5);
  c = mix(c, rgb(p), matte(p) * inside(p));
  outColor = vec4(c, 1.0);
}
