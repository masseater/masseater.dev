// note: 画をゆっくり渦に溶かしながら、場所と時間で色相を回し、色の段を少なくして極彩色にする。
void main() {
  vec2 q = (uv - 0.5) * vec2(aspect(), 1.0);
  float r = length(q);
  vec2 p = rot(q, sin(time * 0.5 + r * 6.0) * 0.5) / vec2(aspect(), 1.0) + 0.5;
  p += 0.01 * vec2(sin(p.y * 30.0 + time * 2.0), cos(p.x * 30.0 + time * 1.5));
  float l = luma(rgb(p));
  vec3 c = hsv(vec3(fract(l * 2.0 + r - time * 0.2), 0.9, 0.4 + 0.6 * l));
  c = floor(c * 5.0) / 5.0;
  outColor = vec4(c, 1.0);
}
