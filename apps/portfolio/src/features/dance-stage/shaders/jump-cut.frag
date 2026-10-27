// note: 同じ構図のまま、0.7 秒ごとに 0.5 秒先へ飛ばす。途中が抜けるので、人物が飛び移るように見える。切るたびに少しだけ寄りも変える。
void main() {
  float cut = floor(time / 0.7);
  float t = time + cut * 0.5;
  float zoom = 1.0 + 0.06 * mod(cut, 3.0);
  vec2 p = (uv - 0.5) / zoom + 0.5;
  outColor = vec4(pastRgb(p, t), 1.0);
}
