// note: 左から強い光を 1 灯だけ当てたように、体の左側を明るく浮かせ、右側と背景を闇に沈める。強い明暗の差で体の形を彫り出す。
void main() {
  vec3 c = rgb(uv);
  float side = smoothstep(0.08, -0.06, uv.x - bodyCenter().x);
  float m = matte(uv);
  float lit = mix(0.12, 1.25, side) * m;
  vec3 body = c * lit;
  vec3 bg = plate(uv) * 0.05;
  outColor = vec4(mix(bg, body, m), 1.0);
}
