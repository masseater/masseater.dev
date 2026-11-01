// note: 速く動いた所に、少し前の体の形を薄く引き伸ばした残像を 3 枚重ねる。アニメで速い動きの間にはさむお化けのような絵である。
void main() {
  vec3 c = rgb(uv);
  float m = matte(uv);
  for (int k = 3; k >= 1; k--) {
    float t = time - float(k) * 0.05;
    vec2 stretch = (uv - bodyCenter()) * (1.0 - 0.04 * float(k)) + bodyCenter();
    float g = pastMatte(stretch, t) * (1.0 - m);
    c = mix(c, mix(pastRgb(stretch, t), vec3(0.9, 0.9, 1.0), 0.4), g * (0.65 - float(k) * 0.15));
  }
  outColor = vec4(c, 1.0);
}
