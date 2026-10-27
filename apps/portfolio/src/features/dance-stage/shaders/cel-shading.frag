// note: 人物の色を明るい面と影の 2 段だけに塗り分け、黒い輪郭線で縁取ってアニメの絵のようにする。背景の部屋はそのまま残す。
void main() {
  vec3 c = rgb(uv);
  float l = luma(c);
  vec3 base = blurRgb(uv, 0.01) / max(luma(blurRgb(uv, 0.01)), 0.05) * 0.7;
  vec3 toon = base * mix(0.65, 1.15, step(0.45, l));
  float e = 0.004;
  float edge = abs(matte(uv + vec2(e, 0.0)) - matte(uv - vec2(e, 0.0))) + abs(matte(uv + vec2(0.0, e * 1.7)) - matte(uv - vec2(0.0, e * 1.7)));
  float inner = abs(l - luma(rgb(uv + vec2(e, e * 1.7)))) * matte(uv);
  vec3 outc = mix(plate(uv), toon, matte(uv));
  outc = mix(outc, vec3(0.05), clamp(edge * 2.0 + step(0.2, inner), 0.0, 1.0));
  outColor = vec4(clamp(outc, 0.0, 1.0), 1.0);
}
