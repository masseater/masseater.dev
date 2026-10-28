// note: 8 拍ごとに画面の上から色とりどりの紙吹雪を打ち出し、ひらひらと裏返りながら落とす。長いテープも何本か弧を描いて降らせる。紙吹雪は WebGL では 70 枚、WebGPU では compute shader で 1536 枚を降らせる。
void main() {
  vec3 c = rgb(uv);
  float burst = floor(beatCount / 8.0);
  float t = mod(beatCount, 8.0) + beat;
  t = t * 0.5;
#ifdef WEBGPU
  vec2 s = splat(uv);
  c = mix(c, hsv(vec3(s.y, 0.7, min(s.x, 1.0))), step(0.3, s.x));
#else
  for (int i = 0; i < 70; i++) {
    float fi = float(i);
    vec2 seed = vec2(fi, burst);
    float x = hash(seed) + sin(t * 2.0 + fi) * 0.03;
    float y = -0.1 + t * (0.25 + 0.2 * hash(seed + 1.0)) - hash(seed + 2.0) * 0.3;
    vec2 pos = vec2(x, y);
    float flip = abs(sin(t * 6.0 + fi));
    vec2 q = rot((uv - pos) * vec2(aspect(), 1.0), fi + t * 3.0);
    float piece = step(abs(q.x), 0.012 * flip + 0.002) * step(abs(q.y), 0.007);
    vec3 col = hsv(vec3(hash(seed + 3.0), 0.7, 0.6 + 0.4 * flip));
    c = mix(c, col, piece);
  }
#endif
  for (int i = 0; i < 5; i++) {
    float fi = float(i);
    float x0 = 0.15 + fi * 0.18;
    float top = -0.2 + t * 0.35;
    float yy = uv.y;
    float x = x0 + sin(yy * 14.0 + fi * 2.0 + t * 2.0) * 0.03;
    float ribbon = step(abs(uv.x - x) * aspect(), 0.006) * step(yy, top) * step(top - 0.5, yy);
    c = mix(c, hsv(vec3(fi * 0.21, 0.6, 1.0)), ribbon);
  }
  outColor = vec4(c, 1.0);
}
