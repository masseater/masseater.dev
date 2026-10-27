// note: 暗い広間の奥の壁に、時間をずらした 3 つの映写を重ならないように並べて映し、後ろの映写機から霧の中を伸びる光の筋を見せる。フィルムの粒と明るさのゆらぎも足す。
void main() {
  vec3 c = vec3(0.02);
  vec2 rects[3] = vec2[3](vec2(0.03, 0.15), vec2(0.36, 0.08), vec2(0.69, 0.2));
  vec2 sizes[3] = vec2[3](vec2(0.28, 0.4), vec2(0.28, 0.45), vec2(0.28, 0.38));
  for (int i = 0; i < 3; i++) {
    vec2 q = (uv - rects[i]) / sizes[i];
    if (q.x > 0.0 && q.x < 1.0 && q.y > 0.0 && q.y < 1.0) {
      vec3 img = pastRgb(q, time - float(i) * 0.7);
      if (i == 1) img = vec3(luma(img));
      if (i == 2) img = img * vec3(1.1, 0.8, 0.6);
      float flick = 0.88 + 0.12 * noise(vec2(time * 18.0, float(i)));
      c = img * flick + (hash(q * resolution + time) - 0.5) * 0.08;
    }
    vec2 lens = vec2(0.35 + float(i) * 0.15, 1.05);
    vec2 target = rects[i] + sizes[i] * 0.5;
    float beam = smoothstep(0.08, 0.0, segment(uv, lens, target) - (1.0 - uv.y) * 0.06);
    c += vec3(0.08, 0.08, 0.07) * beam * (0.5 + 0.5 * fbm(uv * 6.0 + time * 0.3)) * step(0.6, uv.y);
  }
  outColor = vec4(c, 1.0);
}
