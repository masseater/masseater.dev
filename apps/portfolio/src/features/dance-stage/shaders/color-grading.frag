// note: 影を青緑へ、明るい所と肌を橙へ寄せる色の決め方をかける。左右に動く境目の左は元の色、右が仕上げた色である。
void main() {
  vec3 c = rgb(uv);
  float l = luma(c);
  vec3 shadows = vec3(0.0, 0.08, 0.12);
  vec3 highs = vec3(0.12, 0.04, -0.06);
  vec3 graded = c + shadows * (1.0 - smoothstep(0.0, 0.5, l)) + highs * smoothstep(0.4, 1.0, l);
  graded = (graded - 0.5) * 1.15 + 0.5;
  graded = mix(vec3(luma(graded)), graded, 1.2);
  float split = 0.5 + 0.3 * sin(time * 0.5);
  vec3 outc = mix(c, graded, step(split, uv.x));
  outc = mix(outc, vec3(1.0), step(abs(uv.x - split), 0.0015));
  outColor = vec4(clamp(outc, 0.0, 1.0), 1.0);
}
