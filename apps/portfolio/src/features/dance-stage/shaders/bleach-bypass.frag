// note: 銀を残して現像したように、色を半分抜き、明暗の差を強めて硬い画にする。
void main() {
  vec3 c = rgb(uv);
  float l = luma(c);
  vec3 desat = mix(vec3(l), c, 0.45);
  vec3 overlay = mix(2.0 * desat * l, 1.0 - 2.0 * (1.0 - desat) * (1.0 - l), step(0.5, l));
  vec3 outc = (overlay - 0.5) * 1.2 + 0.5;
  outColor = vec4(clamp(outc, 0.0, 1.0), 1.0);
}
