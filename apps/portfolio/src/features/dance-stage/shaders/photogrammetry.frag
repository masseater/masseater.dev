// note: 部屋と踊る人を三角形の面に分けて平らな色で塗り、その上に網目の線を重ねて、写真から復元した立体のように見せる。上には撮影位置を示すカメラの印を弧に並べ、順に光らせる。
void main() {
  vec2 grid = vec2(48.0, 27.0);
  vec2 g = uv * grid;
  vec2 cell = floor(g);
  vec2 f = fract(g);
  float upper = step(f.x, f.y);
  vec2 faceCenter = (cell + mix(vec2(2.0, 1.0), vec2(1.0, 2.0), upper) / 3.0) / grid;
  vec3 col = rgb(faceCenter);
  float shade = 0.85 + 0.15 * (hash(cell + upper) - 0.5) * 2.0;
  vec3 c = col * shade;
  float wire = min(min(f.x, f.y), min(1.0 - f.x, 1.0 - f.y));
  wire = min(wire, abs(f.x - f.y) * 0.7);
  c = mix(c, vec3(0.6, 0.9, 1.0), smoothstep(0.05, 0.0, wire) * 0.35);
  for (int i = 0; i < 9; i++) {
    float a = mix(-1.1, 1.1, float(i) / 8.0);
    vec2 cam = vec2(0.5 + sin(a) * 0.42, 0.1 + (1.0 - cos(a)) * 0.15);
    float lit = step(abs(mod(time * 3.0, 9.0) - float(i)), 0.5);
    vec2 d = abs(uv - cam) * vec2(aspect(), 1.0);
    float icon = step(max(d.x, d.y * 1.4), 0.022);
    c = mix(c, mix(vec3(0.2), vec3(1.0, 0.85, 0.3), lit), icon);
    c = mix(c, vec3(1.0, 0.85, 0.3), smoothstep(0.002, 0.0, segment(uv, cam, bodyCenter())) * lit * 0.6);
  }
  outColor = vec4(c, 1.0);
}
