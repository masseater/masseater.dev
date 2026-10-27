// note: 人物の明るさを高さに見立て、体の上にだけ縦横の細い線の網を張って、面を塗らずに線だけで立体を見せる。
void main() {
  float m = matte(uv);
  float hgt = luma(blurRgb(uv, 0.006)) * 0.02;
  vec2 q = uv * vec2(aspect(), 1.0) * 45.0 + vec2(0.0, hgt * 45.0 * 3.0);
  vec2 f = abs(fract(q) - 0.5);
  float grid = smoothstep(0.08, 0.02, 0.5 - max(f.x, f.y));
  vec3 c = vec3(0.02, 0.04, 0.05);
  c = mix(c, vec3(0.3, 1.0, 0.6), grid * m);
  float e = 0.004;
  float edge = abs(matte(uv + vec2(e, 0.0)) - matte(uv - vec2(e, 0.0))) + abs(matte(uv + vec2(0.0, e * 1.7)) - matte(uv - vec2(0.0, e * 1.7)));
  c = mix(c, vec3(0.5, 1.0, 0.8), clamp(edge * 1.5, 0.0, 1.0));
  outColor = vec4(c, 1.0);
}
