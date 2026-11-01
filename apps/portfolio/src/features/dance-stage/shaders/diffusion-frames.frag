// note: 前のフレームの絵を少し寄せてゆがませた上に、今の踊りをわずかに混ぜて次の絵を作り続ける。形は保ちながら、模様が溶けるように別の物へ変わっていく。
// pass: dream persistent
uniform sampler2D dream;
void main() {
  vec2 c0 = vec2(0.5);
  vec2 warp = vec2(fbm(uv * 4.0 + time * 0.1), fbm(uv * 4.0 + 7.3 - time * 0.1)) - 0.5;
  vec2 p = (uv - c0) * 0.993 + c0 + warp * 0.004;
  vec3 prev = read(dream, p).rgb;
  vec3 now = rgb(uv);
  float n = fbm(uv * 9.0 + time * 0.2);
  vec3 hallucination = hsv(vec3(fract(n + luma(prev) * 0.5), 0.5, luma(prev) * 1.1));
  vec3 c = mix(prev, hallucination, 0.04);
  c = mix(c, now, 0.07 + 0.2 * matte(uv) * 0.3);
  outColor = vec4(c, 1.0);
}
// pass:
uniform sampler2D dream;
void main() { outColor = vec4(read(dream, uv).rgb, 1.0); }
