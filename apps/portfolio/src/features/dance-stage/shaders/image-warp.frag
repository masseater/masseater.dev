// note: 体の中心のまわりで画を渦のようにねじり、ねじる強さを時間とともに行き来させる。中心に近いほど大きく回る。
void main() {
  vec2 center = bodyCenter();
  vec2 q = (uv - center) * vec2(aspect(), 1.0);
  float r = length(q);
  float twist = sin(time * 0.8) * 4.0 * exp(-r * 4.0);
  vec2 p = rot(q, twist) / vec2(aspect(), 1.0) + center;
  outColor = vec4(rgb(p), 1.0);
}
