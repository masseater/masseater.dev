// note: 白黒の漫画のように、明るい所は白、中くらいの影は斜めの線、深い影は真っ黒に塗り分け、輪郭を黒い線で縁取る。
void main() {
  float l = luma(blurRgb(uv, 0.003));
  float lines = step(0.5, fract((uv.x * aspect() + uv.y) * 90.0));
  float tone = l > 0.62 ? 1.0 : l > 0.35 ? lines : 0.0;
  float e = 0.004;
  float edge = abs(matte(uv + vec2(e, 0.0)) - matte(uv - vec2(e, 0.0))) + abs(matte(uv + vec2(0.0, e * 1.7)) - matte(uv - vec2(0.0, e * 1.7)));
  vec3 c = vec3(tone);
  c = mix(c, vec3(0.0), clamp(edge * 2.0, 0.0, 1.0));
  outColor = vec4(c, 1.0);
}
