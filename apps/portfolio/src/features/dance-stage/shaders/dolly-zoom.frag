// note: 人物の大きさは変えずに、背景だけを寄ったり引いたりさせる。カメラを引きながらズームで寄せたときのように、奥行きが伸び縮みして見える。
void main() {
  vec2 center = bodyCenter();
  float s = 1.0 + 0.45 * (0.5 + 0.5 * sin(time * 0.9));
  vec2 p = (uv - center) / s + center;
  vec3 bg = plate(p);
  outColor = vec4(person(uv, bg), 1.0);
}
