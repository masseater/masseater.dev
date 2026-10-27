// note: 左上の強い光源から、画面の中心を通る直線の上に、大きさと色の違う光の輪や六角形を並べる。光源が動くと輪の列も中心をはさんで反対へ動く。
void main() {
  vec2 source = vec2(0.2 + 0.1 * sin(time * 0.4), 0.15 + 0.05 * cos(time * 0.3));
  vec3 c = rgb(uv) * 0.9;
  c += vec3(1.0, 0.9, 0.7) * 0.02 / (dist(uv, source) + 0.02);
  vec2 axis = vec2(0.5) - source;
  for (int i = 0; i < 6; i++) {
    float fi = float(i);
    float t = 0.4 + fi * 0.35;
    vec2 at = source + axis * t * 1.6;
    float r = 0.02 + 0.05 * hash(vec2(fi, 1.0));
    vec2 d = abs((uv - at) * vec2(aspect(), 1.0));
    float hex = max(d.x * 0.866 + d.y * 0.5, d.y);
    float shape = fi < 3.0 ? smoothstep(r, r * 0.8, hex) : smoothstep(0.004, 0.0, abs(length(d) - r));
    c += hsv(vec3(0.05 + fi * 0.13, 0.6, 1.0)) * shape * 0.25;
  }
  outColor = vec4(c, 1.0);
}
