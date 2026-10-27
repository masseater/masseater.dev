// note: 低い位置で足元に寄った画から、6 秒かけて高く引いた全体の画へ上がる。クレーンが持ち上がる動きを、寄りと縦の移動で作る。
void main() {
  float phase = 0.5 - 0.5 * cos(time / 6.0 * PI);
  float zoom = mix(2.6, 1.0, phase);
  vec2 target = mix(vec2(0.5, 0.82), vec2(0.5, 0.5), phase);
  vec2 q = (uv - 0.5);
  q.x *= mix(1.0, 1.0 + 0.15 * (uv.y - 0.5), phase);
  vec2 p = q / zoom + target;
  outColor = vec4(rgb(p), 1.0);
}
