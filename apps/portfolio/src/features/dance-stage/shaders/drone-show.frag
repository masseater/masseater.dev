// note: 夜空に光の点を浮かべ、点の並びで踊る人の形を描く。6 秒ごとに全部の点が飛んでハートの形に組み替わり、また人の形に戻る。WebGL では 240 機、WebGPU では本物のドローンショーと同じ規模の 3840 機を compute shader で飛ばす。
void main() {
  vec3 c = mix(vec3(0.0, 0.02, 0.08), vec3(0.02, 0.05, 0.15), uv.y);
  c = mix(c, vec3(0.03, 0.03, 0.05), step(0.9, uv.y));
#ifdef WEBGPU
  vec2 s = splat(uv);
  float halo = 0.0;
  for (int i = 0; i < 12; i++) {
    float a = float(i) * 2.399;
    vec2 o = vec2(cos(a), sin(a)) * (0.008 + 0.002 * float(i)) * vec2(1.0 / aspect(), 1.0);
    halo += splat(uv + o).x;
  }
  vec3 tint = hsv(vec3(fract(s.y), 0.6, 1.0));
  c += tint * (1.0 - exp(-s.x * 1.2)) + vec3(0.5, 0.6, 1.0) * halo * 0.02;
#else
  float phase = fract(time / 6.0);
  float k = smoothstep(0.35, 0.55, phase) * (1.0 - smoothstep(0.8, 1.0, phase));
  vec2 lo = vec2(0.3, 0.05);
  vec2 hi = vec2(0.85, 0.95);
  for (int i = 0; i < 240; i++) {
    float fi = float(i);
    vec2 g = vec2(mod(fi, 16.0), floor(fi / 16.0)) / vec2(15.0, 14.0);
    vec2 home = mix(lo, hi, g);
    float on = step(0.5, matte(home));
    float a = fi / 240.0 * 2.0 * PI;
    vec2 heart = vec2(16.0 * pow(sin(a), 3.0), -(13.0 * cos(a) - 5.0 * cos(2.0 * a) - 2.0 * cos(3.0 * a) - cos(4.0 * a))) * 0.018;
    heart = heart * vec2(1.0 / aspect(), 1.0) + vec2(0.5, 0.45);
    vec2 pos = mix(home, heart, k);
    float vis = mix(on, 1.0, k);
    float glow = 0.0007 / (pow(dist(uv, pos), 2.0) + 0.00002) * vis;
    c += hsv(vec3(fract(fi * 0.013 + time * 0.05), 0.6, 1.0)) * min(glow, 2.0) * 0.12;
  }
#endif
  outColor = vec4(c, 1.0);
}
